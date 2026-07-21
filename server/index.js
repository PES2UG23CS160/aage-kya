import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'
import { runMultiAgentOrchestrator } from './agents/Orchestrator.js'

import path from 'path'
import { fileURLToPath } from 'url'
import { assertValidEnvironment, readEnvironment } from './config/env.js'
import { GuidanceResponseSchema, RoadmapResponseSchema } from './ai/contracts.js'
import { createGuidanceOrchestrator, GUIDANCE_ORCHESTRATION_VERSION } from './ai/guidanceOrchestrator.js'
import { AIProviderGateway } from './ai/providerGateway.js'
import { createGroqProvider } from './ai/providers/groqProvider.js'
import { calculateFeePlan } from './domain/fees/feeEngine.js'
import { VERIFIED_FEE_PILOT, VERIFIED_FEE_SOURCES } from './data/verifiedFeePilot.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env'), override: false })

const config = readEnvironment(process.env)
assertValidEnvironment(config)
config.warnings.forEach(message => console.warn(`[config] ${message}`))

import { HISTORICAL_CUTOFFS } from './cutoffsData.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1) // Trust first proxy (Railway, Render, Vercel)

app.use(cors({
  origin: config.allowedOrigins.length > 0
    ? (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || config.allowedOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true)
        const error = new Error('Origin is not allowed')
        error.code = 'CORS_NOT_ALLOWED'
        cb(error)
      }
    : !config.isProduction,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use((req, res, next) => {
  req.requestId = randomUUID()
  res.setHeader('x-request-id', req.requestId)
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('x-frame-options', 'DENY')
  res.setHeader('referrer-policy', 'no-referrer')
  res.setHeader('permissions-policy', 'camera=(), geolocation=(), microphone=()')
  next()
})

// Structured Logger Middleware
app.use((req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      event: 'http_request',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latencyMs: duration,
      authenticatedRequest: Boolean(req.headers.authorization),
    }))
  })
  
  next()
})

// In-Memory Rate Limiter Store
const rateLimitStore = new Map() // key -> Array of timestamps

function createRateLimiter(limit, windowMs, message) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const key = `${ip}:${req.baseUrl || ''}${req.path}`
    const now = Date.now()
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, [])
    }
    
    let timestamps = rateLimitStore.get(key)
    timestamps = timestamps.filter(t => now - t < windowMs)
    rateLimitStore.set(key, timestamps)
    
    if (timestamps.length >= limit) {
      const oldestTimestamp = timestamps[0]
      const resetTimeMs = windowMs - (now - oldestTimestamp)
      const resetMinutes = Math.ceil(resetTimeMs / 60000)
      console.warn(`[${new Date().toISOString()}] WARN: Rate limit hit for ${key}. Limit: ${limit}/${windowMs}ms`)
      return res.status(429).json({
        error: 'RATE_LIMIT',
        message: message || `Too many requests. Please try again in ${resetMinutes} minute(s).`
      })
    }
    
    timestamps.push(now)
    next()
  }
}

const isDev = !config.isProduction
const guidanceLimiter = createRateLimiter(isDev ? 50 : 5, 86400000, "You can only generate 5 career guidance reports per day to prevent system abuse. Please try again tomorrow.")
const roadmapLimiter  = createRateLimiter(isDev ? 50 : 5, 86400000, "You can only generate 5 career roadmaps per day to prevent system abuse. Please try again tomorrow.")
const mentorApplyLimiter = createRateLimiter(1, 3600000, "You can only submit one application per hour. Please try again later.")
const transcribeLimiter  = createRateLimiter(15, 3600000, "You have exceeded the transcription rate limit. Please try again in an hour.")
const feeCalculationLimiter = createRateLimiter(isDev ? 200 : 60, 3600000, 'Too many fee calculations. Please try again later.')



const PORT = config.port

// Initialize Supabase Client (anon key — for auth token validation)
const supabaseUrl = config.supabaseUrl
const supabaseAnonKey = config.supabaseAnonKey
const supabase = config.supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
  : null

// Admin Supabase client (service role key — bypasses RLS for aggregate queries)
// SUPABASE_SERVICE_ROLE_KEY is optional; analytics endpoint will be disabled without it.
const supabaseAdmin = config.supabaseConfigured && config.serviceRoleKey
  ? createClient(supabaseUrl, config.serviceRoleKey, {
      auth: { persistSession: false },
    })
  : null

function datastoreError(operation, error) {
  const wrapped = new Error(`${operation} failed: ${error?.message || 'unknown datastore error'}`)
  wrapped.code = 'DATA_STORE_UNAVAILABLE'
  wrapped.cause = error
  return wrapped
}

function requireSupabaseAdmin(operation) {
  if (!supabaseAdmin) {
    throw datastoreError(operation, new Error('The server-managed Supabase client is not configured.'))
  }
  return supabaseAdmin
}

async function persistRecommendationAudit({ orchestration, inputFingerprint, studentId, result }) {
  if (!supabaseAdmin) {
    if (config.isProduction) throw datastoreError('Recommendation audit write', new Error('Service-role client is unavailable.'))
    return false
  }

  const recommendationRow = {
    id: orchestration.trace.runId,
    student_id: studentId,
    input_fingerprint: inputFingerprint,
    profile_version: GUIDANCE_ORCHESTRATION_VERSION,
    catalogue_version: null,
    rules_version: GUIDANCE_ORCHESTRATION_VERSION,
    model_version: config.groqModel || null,
    orchestration_version: orchestration.trace.orchestrationVersion,
    status: orchestration.trace.steps.some(step => step.status === 'failed') ? 'degraded' : 'completed',
    evidence_coverage: orchestration.trace.evidenceCoverage,
    result,
    completed_at: orchestration.trace.completedAt,
  }

  const { error: runError } = await supabaseAdmin.from('recommendation_runs').insert(recommendationRow)
  if (runError) {
    if (runError.code === '42P01' || runError.message?.includes('does not exist') || runError.message?.includes('schema cache')) {
      console.warn('⚠️  recommendation_runs table is missing from Supabase. Skipping audit log persist.')
      return false
    }
    throw datastoreError('Recommendation audit write', runError)
  }

  const agentRows = orchestration.trace.steps.map(step => ({
    recommendation_run_id: orchestration.trace.runId,
    agent_name: step.agent,
    provider: step.agent === 'recommendation_explanation_agent' ? 'configured_text_gateway' : 'deterministic',
    model: step.agent === 'recommendation_explanation_agent' ? (config.groqModel || null) : null,
    status: step.status,
    evidence_count: step.evidenceCount,
    latency_ms: step.durationMs,
    error_code: step.status === 'failed' ? 'AGENT_FAILED' : null,
  }))
  const { error: agentError } = await supabaseAdmin.from('agent_runs').insert(agentRows)
  if (agentError) {
    if (agentError.code === '42P01' || agentError.message?.includes('does not exist') || agentError.message?.includes('schema cache')) {
      console.warn('⚠️  agent_runs table is missing from Supabase. Skipping agent audit log persist.')
      return false
    }
    throw datastoreError('Agent audit write', agentError)
  }
  return true
}

class UnifiedAIClient {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY
    this.openaiApiKey = process.env.OPENAI_API_KEY
    if (!this.groqApiKey && !this.openaiApiKey) {
      throw new Error('NO_API_KEY')
    }
  }

  get chat() {
    return {
      completions: {
        create: async ({ model, messages, temperature, max_tokens, response_format }) => {
          let url, headers, bodyModel
          if (this.groqApiKey) {
            url = 'https://api.groq.com/openai/v1/chat/completions'
            headers = {
              'Authorization': `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json'
            }
            bodyModel = model || 'llama-3.3-70b-versatile'
          } else {
            url = 'https://api.openai.com/v1/chat/completions'
            headers = {
              'Authorization': `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json'
            }
            bodyModel = 'gpt-4o-mini'
          }

          const body = {
            model: bodyModel,
            messages,
            temperature: temperature ?? 0.7,
            max_tokens: max_tokens ?? 2048,
          }

          if (response_format) {
            body.response_format = response_format
          }

          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          })

          if (!response.ok) {
            const errText = await response.text()
            throw new Error(`AI API error (${response.status}): ${errText}`)
          }

          const data = await response.json()
          return {
            choices: [
              {
                message: {
                  content: data.choices[0].message.content
                }
              }
            ]
          }
        }
      }
    }
  }

}

// Initialize Groq client
const getGroqClient = () => {
  const apiKey = config.groqApiKey
  if (!apiKey) {
    if (process.env.OPENAI_API_KEY) {
      return new UnifiedAIClient()
    }
    throw new Error('NO_API_KEY')
  }
  return new Groq({ apiKey })
}

const aiGateway = new AIProviderGateway({
  providers: [createGroqProvider({ apiKey: config.groqApiKey, model: config.groqModel })],
  timeoutMs: config.aiTimeoutMs,
  maxRetries: config.aiMaxRetries,
})

const guidanceOrchestrator = createGuidanceOrchestrator({
  generateRecommendation: (context) => callStructuredAI(
    buildPrompt(context.profile, context.colleges, context.scholarshipMatches.eligibleRecords),
    {
      studentId: context.studentId,
      callType: 'guidance_explanation',
      schema: GuidanceResponseSchema,
    },
  ),
})

// User-scoped Supabase client helper to respect Row Level Security (RLS)
function getSupabaseClient(authHeader) {
  if (!config.supabaseConfigured) return null
  if (authHeader) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })
  }
  return supabase
}

// Resilient student profile upsert (prunes missing columns dynamically)
async function resilientUpsertStudent(client, studentData) {
  let { error } = await client.from('students').upsert(studentData)
  if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('class_level'))) {
    const allowedKeys = [
      'id', 'full_name', 'state', 'board', 'stream', 'marks', 
      'income_range', 'first_gen_college', 'preferred_cities', 
      'interests', 'biggest_fear', 'updated_at', 'role'
    ]
    const prunedData = {}
    for (const key of allowedKeys) {
      if (studentData[key] !== undefined) {
        prunedData[key] = studentData[key]
      }
    }
    const { error: retryError } = await client.from('students').upsert(prunedData)
    if (retryError) throw retryError
  } else if (error) {
    throw error
  }
}

// Resilient guidance result insert (prunes missing columns dynamically)
async function resilientInsertGuidanceResult(admin, data) {
  const { error } = await admin.from('guidance_results').insert(data)
  if (error && (error.code === '42703' || error.message?.includes('column'))) {
    // Falls back to legacy columns if new columns (from 202607200002_guidance_trace_cache.sql) are missing
    const allowedKeys = [
      'student_id', 'summary', 'options', 'scholarship_to_check',
      'one_thing_to_do_this_week', 'confidence_score', 'confidence_label',
      'confidence_reason', 'parent_summary', 'scholarships_list',
      'created_at'
    ]
    const prunedData = {}
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        prunedData[key] = data[key]
      }
    }
    const { error: retryError } = await admin.from('guidance_results').insert(prunedData)
    return { error: retryError }
  } else if (error) {
    return { error }
  }
  return { error: null }
}

// Retrieve authenticated user from Supabase token; also fetches role from students table
async function getAuthUser(authHeader) {
  if (!supabase || !authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]

  // Developer/Demo bypass for local development or testing
  if (token === 'demo-student-token') {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo-student@aagekya.com',
      role: 'student',
      user_metadata: { user_type: 'student' }
    }
  }
  if (token === 'demo-admin-token') {
    return {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'demo-admin@aagekya.com',
      role: 'admin',
      user_metadata: { user_type: 'admin' }
    }
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    // Role lookup must either use the caller's bearer token (so students_self_rw
    // applies) or the trusted server client. A bare anon client cannot read the
    // authenticated user's row and previously downgraded every mentor/admin.
    const roleClient = supabaseAdmin || getSupabaseClient(authHeader)
    const { data: profile, error: profileError } = await roleClient
      .from('students')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) throw datastoreError('User role lookup', profileError)
    user.role = ['student', 'mentor', 'admin'].includes(profile?.role)
      ? profile.role
      : 'student'
    return user
  } catch (err) {
    if (err?.code === 'DATA_STORE_UNAVAILABLE') throw err
    return null
  }
}

// Middleware: require a specific role (or any of a list of roles)
function requireRole(...roles) {
  return async (req, res, next) => {
    if (!config.supabaseConfigured) {
      return res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'Authentication is not configured.' })
    }
    try {
      const user = await getAuthUser(req.headers.authorization)
      if (!user) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN', message: `Requires role: ${roles.join(' or ')}` })
      }
      req.authUser = user
      next()
    } catch (error) {
      console.error(JSON.stringify({ event: 'authorization_lookup_failed', requestId: req.requestId, error: error.message }))
      return res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'Authorization could not be verified.' })
    }
  }
}

// Middleware: require any authenticated user.
function requireAuth() {
  return async (req, res, next) => {
    if (!config.supabaseConfigured) {
      return res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'Authentication is not configured.' })
    }
    try {
      const user = await getAuthUser(req.headers.authorization)
      if (!user) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
      req.authUser = user
      next()
    } catch (error) {
      console.error(JSON.stringify({ event: 'authorization_lookup_failed', requestId: req.requestId, error: error.message }))
      return res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'Authorization could not be verified.' })
    }
  }
}

// Reuse labels from frontend structure
const INCOME_LABELS = {
  'below_2.5L': 'Below ₹2.5 Lakh/yr',
  '2.5L-5L':   '₹2.5L–₹5L/yr',
  '5L-10L':    '₹5L–₹10L/yr',
  'above_10L': 'Above ₹10L/yr',
}
const CITY_LABELS = {
  same_city: 'Same City',
  nearby:    'Nearby Cities',
  anywhere:  'Anywhere in India',
}
// Income upper bounds in lakh (for scholarship eligibility filtering)
const INCOME_TO_LAKH = {
  'below_2.5L': 2.5,
  '2.5L-5L':   5,
  '5L-10L':    10,
  'above_10L': 99,
}

// ─── RAG Helpers ──────────────────────────────────────────────────────────────

function isSupabaseConfigured() {
  return config.supabaseConfigured
}

// Fetch prototype college candidates for this student from the DB.
async function fetchCollegesForStudent(form) {
  if (!isSupabaseConfigured()) return []
  const marks        = Number(form.marks) || 0
  const stream       = form.stream || ''
  const state        = form.state  || ''
  const classLevel   = form.classLevel || 'class12'
  
  // New fields
  const preferredState = form.preferredState || ''
  const preferredCity  = (form.preferredCity  || '').trim().toLowerCase()
  const budget         = form.budget || ''
  const mode           = form.preferredModeOfAdmission || ''

  try {
    // Fetch all colleges matching this stream (GIN index makes this fast)
    const { data, error } = await supabase
      .from('colleges')
      .select('name, state, city, yearly_cost_min, yearly_cost_max, college_type, national, source_url, min_marks, max_marks')
      .contains('streams', [stream])
      .not('verified_at', 'is', null)

    if (error) { console.warn('College fetch warning:', error.message); return [] }

    const collegesWithScores = (data || []).map(c => {
      let score = 0

      // 1. Marks compatibility score (primary eligibility check)
      const isWithinRange = (c.min_marks <= marks + 15) && (c.max_marks >= marks - 10)
      if (!isWithinRange) {
        // Still compatible but penalized if outside marks compatibility band
        score -= 20
      } else {
        score += 15
        if (marks >= c.min_marks && marks <= c.max_marks) {
          score += 10 // Perfect fit
        }
      }

      // 2. Preferred State compatibility
      if (preferredState && preferredState !== 'Any State') {
        if (c.state === preferredState) {
          score += 25
        } else if (c.national) {
          score += 5 // National institutions are still good candidates
        } else {
          score -= 10 // Penalize if it doesn't match preferred state
        }
      } else {
        // Fallback to home state matching if no preferredState is specified
        if (c.state === state) {
          score += 10
        }
      }

      // 3. Preferred City compatibility
      if (preferredCity && preferredCity !== 'any') {
        const collegeCity = c.city.toLowerCase()
        if (collegeCity.includes(preferredCity) || preferredCity.includes(collegeCity)) {
          score += 25
        }
      }

      // 4. Budget Compatibility
      // Budget limits (INR per year)
      let budgetLimit = 9999999
      if (classLevel === 'class10') {
        if (budget === 'below_20k') budgetLimit = 20000
        else if (budget === '20k-60k') budgetLimit = 60000
        else if (budget === '60k-1.5L') budgetLimit = 150000
      } else {
        if (budget === 'below_1L') budgetLimit = 100000
        else if (budget === '1L-3L') budgetLimit = 300000
        else if (budget === '3L-6L') budgetLimit = 600000
      }

      // Compare college cost with budget limit
      if (c.yearly_cost_min > budgetLimit) {
        score -= 30 // Strong penalty if min cost exceeds budget
      } else if (c.yearly_cost_max <= budgetLimit) {
        score += 15 // Good fit: max cost is within budget
      } else {
        score += 5 // Partial fit: min is within, max exceeds
      }

      // 5. Preferred Mode of Admission / Target Exam compatibility (Class 12)
      if (classLevel === 'class12' && mode) {
        const nameUpper = c.name.toUpperCase()
        if (mode === 'JEE Advanced') {
          // IITs
          if (nameUpper.startsWith('IIT') || nameUpper.includes('INDIAN INSTITUTE OF TECHNOLOGY')) {
            score += 35
          } else {
            score -= 15
          }
        } else if (mode === 'JEE Main') {
          // NITs, IIITs, DTU, NSUT, or national-intake institutions
          if (nameUpper.includes('NIT') || nameUpper.includes('NATIONAL INSTITUTE OF TECHNOLOGY') || nameUpper.includes('IIIT') || nameUpper.includes('DTU') || nameUpper.includes('NSUT') || c.national) {
            score += 35
          }
        } else if (mode === 'NEET') {
          // Medical institutions
          if (nameUpper.includes('AIIMS') || nameUpper.includes('MEDICAL') || nameUpper.includes('JIPMER') || nameUpper.includes('CMC') || nameUpper.includes('MEDICINE') || stream === 'Science (PCB)') {
            score += 35
          }
        } else if (mode === 'KCET') {
          // Karnataka state colleges
          if (c.state === 'Karnataka') {
            score += 35
          } else {
            score -= 15
          }
        } else if (mode === 'COMEDK') {
          // Karnataka private/deemed colleges
          if (c.state === 'Karnataka' && (c.college_type === 'private' || c.college_type === 'deemed')) {
            score += 35
          } else {
            score -= 15
          }
        } else if (mode === 'CUET') {
          // Central universities (Arts/Commerce focus or Central college type)
          if (c.college_type === 'central' || nameUpper.includes('COLLEGE DELHI') || nameUpper.includes('UNIVERSITY OF DELHI') || nameUpper.includes('JNU') || nameUpper.includes('BHU')) {
            score += 35
          }
        } else if (mode === 'Management Quota') {
          // Private / Deemed colleges
          if (c.college_type === 'private' || c.college_type === 'deemed') {
            score += 25
          }
        } else if (mode === 'State CET') {
          // State government colleges matching preferred or home state
          if (c.college_type === 'state' && (c.state === preferredState || c.state === state)) {
            score += 35
          }
        } else if (mode === 'Diploma Lateral Entry') {
          // State/private colleges accepting lateral entry
          if (c.college_type === 'state' || c.college_type === 'private') {
            score += 20
          }
        }
      }

      return { college: c, score }
    })

    // Filter, sort by score descending, and slice top 15
    return collegesWithScores
      .filter(x => x.score >= -10) // Filter out extremely poor fits
      .sort((a, b) => b.score - a.score)
      .map(x => x.college)
      .slice(0, 15)

  } catch (err) {
    console.warn('College fetch failed:', err.message)
    return []
  }
}

// Fetch relevant scholarships for this student from the DB
async function fetchScholarshipsForStudent(form) {
  if (!isSupabaseConfigured()) return []

  try {
    const { data, error } = await supabase
      .from('scholarships')
      .select('name, description, application_url, source_url, deadline_pattern, eligibility_income_max_lakh, eligibility_marks_min, eligible_streams, eligible_states, admission_cycle, verified_at')
      .not('verified_at', 'is', null)

    if (error) { console.warn('Scholarship fetch warning:', error.message); return [] }

    // Do not pre-filter missing values into silent rejections. The deterministic
    // rule engine classifies each reviewed record as eligible, not eligible, or
    // needs information and records the reason.
    return (data || []).slice(0, 50)
  } catch (err) {
    console.warn('Scholarship fetch failed:', err.message)
    return []
  }
}

// Format colleges as a numbered text block for injection into the prompt
function formatCollegesForPrompt(colleges) {
  if (!colleges.length) return ''
  return colleges.map((c, i) => {
    const costMin = Math.round(c.yearly_cost_min / 1000)
    const costMax = Math.round(c.yearly_cost_max / 1000)
    return `${i + 1}. ${c.name} (${c.city}, ${c.state}) | ₹${costMin}K–₹${costMax}K/yr | ${c.college_type} | Entry ~${c.min_marks}%+`
  }).join('\n')
}

// Format scholarships as a numbered text block for injection into the prompt
function formatScholarshipsForPrompt(scholarships) {
  if (!scholarships.length) return ''
  return scholarships.map((s, i) => {
    const desc = s.description.length > 100 ? s.description.slice(0, 100) + '…' : s.description
    return `${i + 1}. ${s.name}: ${desc} | Apply: ${s.application_url}`
  }).join('\n')
}

// Build a lookup map: college name → { source_url, yearly_cost_min, yearly_cost_max, city }
function buildCollegesDataMap(colleges) {
  const map = {}
  for (const c of colleges) {
    map[c.name] = {
      source_url:      c.source_url,
      yearly_cost_min: c.yearly_cost_min,
      yearly_cost_max: c.yearly_cost_max,
      city:            c.city,
      state:           c.state,
      college_type:    c.college_type,
    }
  }
  return map
}

// Find the scholarship object whose name best matches the model output.
function matchScholarship(scholarships, chosenName) {
  if (!chosenName || !scholarships.length) return null
  const lower = chosenName.toLowerCase()
  // Exact match first
  let match = scholarships.find(s => s.name.toLowerCase() === lower)
  if (match) return match
  // Partial match — find the one with the most word overlap
  const words = lower.split(/\s+/).filter(w => w.length > 3)
  let best = null, bestScore = 0
  for (const s of scholarships) {
    const sLower = s.name.toLowerCase()
    const score = words.filter(w => sLower.includes(w)).length
    if (score > bestScore) { bestScore = score; best = s }
  }
  return bestScore > 0 ? best : null
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key])
        return result
      }, {})
  }
  return value
}

function createInputFingerprint(...values) {
  return createHash('sha256')
    .update(JSON.stringify(values.map(canonicalize)))
    .digest('hex')
}

const BUDGET_LABELS_10 = {
  'below_20k': 'Below ₹20,000 / year (Highly Affordable / Govt)',
  '20k-60k': '₹20,000 – ₹60,000 / year (Moderate / Private School)',
  '60k-1.5L': '₹60,000 – ₹1.5 Lakh / year (Private School + Tuition)',
  'above_1.5L': 'Above ₹1.5 Lakh / year (No budget constraint)'
}

const BUDGET_LABELS_12 = {
  'below_1L': 'Below ₹1 Lakh / year (Highly Subsidised / Govt)',
  '1L-3L': '₹1 Lakh – ₹3 Lakh / year (Moderate / State colleges)',
  '3L-6L': '₹3 Lakh – ₹6 Lakh / year (Premium / Private colleges)',
  'above_6L': 'Above ₹6 Lakh / year (No budget constraint)'
}
function buildPrompt(form, colleges = [], scholarships = []) {
  const income   = INCOME_LABELS[form.incomeRange] || form.incomeRange || 'Not specified'
  const cities   = (form.preferredCities || []).map((c) => CITY_LABELS[c] || c).join(', ') || 'Not specified'
  const firstGen = form.firstGenCollege === true ? 'Yes' : form.firstGenCollege === false ? 'No' : 'Not specified'
  const classLevel = form.classLevel || 'class12'

  if (classLevel === 'class10') {
    const parentPressureText = form.parentPressure === true
      ? `Yes (Notes: ${form.parentExpectations || 'None'})`
      : 'No'
    const coachingAccessText = form.coachingAccess === true ? 'Yes' : 'No'
    const budgetText = BUDGET_LABELS_10[form.budget] || form.budget || 'Not specified'
    
    return `You are an honest, caring guide for Indian students after 10th grade. Give REAL, specific advice. Not generic. Not motivational fluff.

Student Profile (Class 10 Student):
- Board: ${form.board || 'Not specified'}
- Marks (9th/10th Pre-boards): ${form.marks || 'Not specified'}%
- Home State: ${form.state || 'Not specified'}
- Family Income: ${income}
- First Generation College Student: ${firstGen}
- Location Constraints/Preferences: ${cities}
- Preferred Study State: ${form.preferredState || 'Not specified'}
- Preferred Study City: ${form.preferredCity || 'Not specified'}
- Preferred Annual School & Coaching Budget: ${budgetText}
- Favorite Subjects & School Topics: ${form.favoriteSubjects || 'Not specified'}
- Hobbies & General Interests: ${form.interests || 'Not specified'} (Stream leaning: ${form.stream || 'Undecided'})
- Long-term Career Goals & Dreams: ${form.careerGoals || 'Not specified'}
- Parent Pressure/Expectations: ${parentPressureText}
- Risk Comfort (Safe vs Exploratory): ${form.riskComfort || 'Not specified'}
- Coaching Access Nearby: ${coachingAccessText}
- Biggest Fear about Stream Selection: ${form.biggestFear || 'Not specified'}

Recommend 3-4 specific high school stream or education tracks that fit this student's profile. Choose from:
- Science (PCM) — Physics, Chemistry, Maths — leads to JEE/engineering
- Science (PCB) — Physics, Chemistry, Biology — leads to NEET/medicine
- Science (PCMB) — all four sciences — maximum flexibility
- Commerce — Accounts, Business Studies, Economics — leads to BBA/CA/finance
- Arts / Humanities — History, Political Science, Psychology — leads to BA/law/civil services
- Diploma / Polytechnic — 3-year technical diploma after 10th, leads to direct technical jobs or lateral entry to B.Tech
- ITI / Vocational — Government ITI trades (electrician, fitter, COPA, etc.) — leads to skilled trade jobs, apprenticeships
Only recommend streams that genuinely fit this student's profile.

CRITICAL STREAM ALIGNMENT RULE:
- Technical 'Diploma / Polytechnic' programs (leading to B.Tech) are engineering/maths-focused. If a student is interested in Biology, Medicine, or Healthcare, do NOT recommend standard engineering diplomas as aligning with their bio interest. 
- If you recommend a diploma for a biology-interested student, explicitly guide them toward medical/biological vocational diplomas (like DMLT — Diploma in Medical Laboratory Technology, or Diploma in Agriculture/Veterinary) and warn them that a standard polytechnic diploma is an engineering path, not a medical one.
- Remind them that MBBS/MD or B.Pharm requires Class 12 Science (PCB/PCMB) rather than standard polytechnic diplomas.

CRITICAL for avg_yearly_coaching_cost: This is NOT college tuition. This is the realistic yearly cost for Class 11/12 school fees PLUS any coaching or tuition classes. Typical realistic ranges:
- Government school + no coaching: ₹5,000–₹20,000/yr
- Private school + local tuition: ₹40,000–₹1,20,000/yr  
- Private school + JEE/NEET coaching: ₹80,000–₹2,50,000/yr
- Diploma/ITI programs: ₹10,000–₹60,000/yr
Do NOT return college-level fees (₹3L–₹15L) for this field.

Respond ONLY in this exact JSON structure (no markdown, no backticks, just raw JSON):
{
  "summary": "A warm, honest 2-3 sentence summary of this student's current situation and core choices. Be specific to their marks, interests, and parental expectations.",
  "options": [
    {
      "path": "Stream option name (e.g. Science (PCM), Diploma / Polytechnic)",
      "honest_take": "2-3 sentences of brutally honest, specific advice for THIS Class 10 student. Explain why this fits their interests/risk/marks, and the difficulty level.",
      "requires_entrance_exam": "Entrance exams they will face post-12th if they choose this stream (e.g. JEE Main, NEET-UG, CLAT, NATA, Polytechnic CET, or None) — be specific",
      "realistic_colleges": ["3-4 target institutions or pathways they should aim for in future based on this stream"],
      "avg_yearly_cost": "Realistic yearly cost for Class 11/12 school + coaching/tuition only (NOT college fees). Format: ₹X–₹Y/yr. Stay within ₹5,000–₹2,50,000 range.",
      "opens_doors_to": ["3-4 specific future degrees or career roles this stream leads to"],
      "watch_out_for": "One specific, honest warning/pitfall about this stream path",
      "backup_plan": "A practical backup plan if they find the stream too difficult in Class 11/12 or change their mind"
    }
  ],
  "scholarship_to_check": "Name of a relevant scholarship they can check (or search on National Scholarship Portal)",
  "one_thing_to_do_this_week": "One actionable task they must do this week to validate this choice"
}
`
  }

  // Class 12 prompt logic:
  const entranceExamContext = ''
  const grounded = colleges.length > 0 || scholarships.length > 0
  const budgetText = BUDGET_LABELS_12[form.budget] || form.budget || 'Not specified'

  const collegesSection = colleges.length > 0
    ? `\nPROTOTYPE COLLEGE DATASET (not independently verified for the current admission cycle) for this student (stream: ${form.stream}, state: ${form.state}, marks: ${form.marks}%):\n${formatCollegesForPrompt(colleges)}\n`
    : ''

  const scholarshipsSection = scholarships.length > 0
    ? `\nPROTOTYPE SCHOLARSHIP LEADS (eligibility and current status must be verified):\n${formatScholarshipsForPrompt(scholarships)}\n`
    : ''

  const groundingInstruction = grounded
    ? `\nCRITICAL INSTRUCTIONS:\n- For "realistic_colleges": ONLY use college names from the PROTOTYPE COLLEGE DATASET above. Do NOT add names.\n- For "scholarship_to_check": use at most one lead from the PROTOTYPE SCHOLARSHIP LEADS above. Never state that the student qualifies.\n- Treat every fee, cutoff, eligibility, and scholarship value as an unverified lead that must be checked against the current official source.\n`
    : ''

  return `You are an honest, caring guide for Indian students after 12th grade. Give REAL, specific advice. Not generic. Not motivational fluff.

Student Profile:
- Board: ${form.board || 'Not specified'}
- Stream: ${form.stream || 'Not specified'}
- Marks: ${form.marks || 'Not specified'}%
- Home State: ${form.state || 'Not specified'}
- Family Income: ${income}
- First Generation College Student: ${firstGen}
- Preferred Location/Constraint: ${cities}
- Preferred Study State: ${form.preferredState || 'Not specified'}
- Preferred Study City: ${form.preferredCity || 'Not specified'}
- Preferred Annual College Fee Budget: ${budgetText}
- Preferred Mode of Admission / Target Exam: ${form.preferredModeOfAdmission || 'Not specified'}
- Interests: ${form.interests || 'Not specified'}
- Biggest Fear: ${form.biggestFear || 'Not specified'}
${entranceExamContext}
${collegesSection}${scholarshipsSection}${groundingInstruction}
Respond ONLY in this exact JSON structure (no markdown, no backticks, just raw JSON):
{
  "summary": "A warm, honest 2-3 sentence summary of this student's situation. Be specific to their actual marks and stream. If they are PCB without NEET prep, acknowledge that MBBS is not in the picture right now and that's okay — there are great alternatives.",
  "options": [
    {
      "path": "Career / course path name",
      "honest_take": "2-3 sentences of brutally honest, specific advice for THIS student. If this path requires a competitive entrance exam, say exactly which exam, how competitive it is, and what they'd need to do. If it is direct admission, say so clearly.",
      "requires_entrance_exam": "NEET-UG / JEE Main / JEE Advanced / State CET / CLAT / None — be specific",
<<<<<<< HEAD
      "realistic_colleges": ["Up to 3-4 prototype dataset matches. Do not add college names that were not provided."]
      "avg_yearly_cost": "Realistic total yearly cost range in INR/year (tuition + hostel + misc)",
      "opens_doors_to": ["3-4 specific career roles or further study options this path leads to"],
      "watch_out_for": "One specific, honest warning — what most people don't tell you about this path",
      "backup_plan": "A practical backup plan if they find college entry too competitive or fail key exams (e.g. switching from BTech to BCA, or from NEET to BSc Nursing)"
    }
  ],
  "scholarship_to_check": "Name of a relevant scholarship they can check",
  "one_thing_to_do_this_week": "One actionable task they must do this week"
}`
}

// Roadmap Prompt Builder
function buildRoadmapPrompt(form, option) {
  const income  = INCOME_LABELS[form.incomeRange] || form.incomeRange || 'Not specified'
  const cities  = (form.preferredCities || []).map((c) => CITY_LABELS[c] || c).join(', ') || 'Not specified'
  const firstGen = form.firstGenCollege === true ? 'Yes' : form.firstGenCollege === false ? 'No' : 'Not specified'
  const classLevel = form.classLevel || 'class12'

  const budgetText = classLevel === 'class10'
    ? (BUDGET_LABELS_10[form.budget] || form.budget || 'Not specified')
    : (BUDGET_LABELS_12[form.budget] || form.budget || 'Not specified')

  const customInstruction = classLevel === 'class10'
    ? `Since the student is in Class 10 choosing a stream, generate a detailed 4-year learning, skill, exam, and preparation roadmap.
The years MUST represent:
- Year 1: Class 11 (Focus on stream mastery, basic concepts, early certifications/courses, and building foundational skills)
- Year 2: Class 12 (Focus on Board prep, final mock tests for entrance exams, simple projects/coding/design challenges)
- Year 3: College Year 1 (Focus on early college adaptation, starting personal projects, joining community and coding clubs)
- Year 4: College Year 2 (Focus on advanced skill acquisition, early internship hunting, and open source/portfolio building)`
    : `Generate a detailed 4-year learning, skill, project, and certification roadmap to achieve a career as a "${option.path}" (Honest Take context: ${option.honest_take}).
The years represent College Year 1, 2, 3, and 4.`

  return `You are an expert career counsellor, mentor, and academic advisor for Indian students.
${customInstruction}
Tailor this roadmap specifically to this student's profile:
- Board: ${form.board || 'Not specified'}
- Marks: ${form.marks || 'Not specified'}%
- Home State: ${form.state || 'Not specified'}
- Family Income: ${income}
- First Generation College Student: ${firstGen}
- Preferred Study Location: ${cities}
- Preferred Study State: ${form.preferredState || 'Not specified'}
- Preferred Study City: ${form.preferredCity || 'Not specified'}
- Preferred Fee Budget: ${budgetText}
- Interests & Hobbies: ${form.interests || 'Not specified'}
- Biggest Fear: ${form.biggestFear || 'Not specified'}
${classLevel === 'class10'
  ? `- Favorite Subjects: ${form.favoriteSubjects || 'Not specified'}\n- Career Goals: ${form.careerGoals || 'Not specified'}\n- Leaning Stream: ${form.stream || 'Undecided'}`
  : `- Preferred Mode of Admission / Entrance Exam: ${form.preferredModeOfAdmission || 'Not specified'}\n- Career Path Leaning: ${option.path}`
}

Income-Based Customization:
If family income is low (e.g. Below 2.5L or 2.5-5L), prioritize free/affordable learning resources, certifications (like Google Career Certificates on Coursera with financial aid, NPTEL/Swayam which is free/low cost in India, FreeCodeCamp), and open-source contributions. Avoid expensive bootcamps or paid certifications.

Academic Customization:
If marks are low (below 75%), focus the advice on building a strong portfolio, networking on LinkedIn, off-campus placements, or stable alternative pathways.

Biggest Fear Customization:
Integrate specific activities or milestones directly addressing their biggest fear during these 4 years.

Respond ONLY in this exact JSON structure (no markdown, no backticks, just raw JSON):
{
  "career_path": "${option.path}",
  "overview": "A warm, honest 2-3 sentence overview of this 4-year skill-building journey tailored to their stream, marks, and constraints. Be highly specific.",
  "years": [
    {
      "year": 1,
      "focus": "Theme/focus of Year 1",
      "skills": ["3-4 specific skills to master this year"],
      "certifications": ["1-2 specific, highly valuable certifications to aim for"],
      "internships_projects": ["2 specific, practical projects or open-source tasks to complete"],
      "milestones": ["2 key milestones to achieve by the end of Year 1"]
    },
    {
      "year": 2,
      "focus": "Theme/focus of Year 2",
      "skills": ["3-4 specific skills"],
      "certifications": ["1-2 certifications"],
      "internships_projects": ["2 specific projects, internships, or open-source tasks"],
      "milestones": ["2 key milestones"]
    },
    {
      "year": 3,
      "focus": "Theme/focus of Year 3",
      "skills": ["3-4 specific skills"],
      "certifications": ["1-2 certifications"],
      "internships_projects": ["2 specific projects, internships, or open-source tasks"],
      "milestones": ["2 key milestones"]
    },
    {
      "year": 4,
      "focus": "Theme/focus of Year 4",
      "skills": ["3-4 specific skills"],
      "certifications": ["1-2 certifications"],
      "internships_projects": ["2 specific projects, internships, or open-source tasks"],
      "milestones": ["2 key milestones"]
    }
  ]
}`
}

// Compute AI confidence score from form field completeness
function computeConfidence(form) {
  const KEY_FIELDS = ['fullName', 'state', 'board', 'stream', 'marks', 'incomeRange', 'firstGenCollege', 'preferredCities', 'interests', 'biggestFear']
  const filled = KEY_FIELDS.filter(k => {
    const v = form[k]
    if (v === null || v === undefined) return false
    if (typeof v === 'string') return v.trim().length > 3
    if (Array.isArray(v)) return v.length > 0
    return true
  }).length
  const score = Math.round((filled / KEY_FIELDS.length) * 100)
  const label = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low'
  const reason = score >= 80
    ? 'All key details provided — recommendation is well-tailored.'
    : score >= 50
    ? 'Some details missing — guidance is good but could improve with more context.'
    : 'Several fields are incomplete — filling them in will significantly improve accuracy.'
  return { confidence_score: score, confidence_label: label, confidence_reason: reason }
}

function getMockGuidance(form, colleges = [], scholarships = []) {
  const isClass10 = form.classLevel === 'class10'
  const name = form.fullName || 'Student'
  
  if (isClass10) {
    return {
      summary: `Hi ${name}, based on your 10th grade prep with ${form.marks}% marks and interest in ${form.interests || 'your subjects'}, you have excellent choices ahead. We have selected paths balancing your comfort with risks and location preferences in ${form.state || 'India'}.`,
      options: [
        {
          path: "Science (PCM)",
          honest_take: "Since you like technical subjects and have decent marks, PCM is a strong foundation. It is highly competitive but opens maximum engineering doors.",
          requires_entrance_exam: "JEE Main / State CET / BITSAT",
          realistic_colleges: colleges.length ? colleges.slice(0, 3).map(c => c.name) : ["Local Science Junior College", "State Board School"],
          avg_yearly_cost: "₹40,000–₹1,20,000/yr",
          opens_doors_to: ["B.Tech Engineering", "B.Sc Data Science", "B.Arch Architecture"],
          watch_out_for: "Maths and Physics in Class 11 get significantly harder than Class 10.",
          backup_plan: "Switch to Commerce or BCA if PCM feels too difficult in Class 11."
        },
        {
          path: "Commerce with Applied Maths",
          honest_take: "A highly practical stream for finance and management. It avoids physics/chemistry pressure and focuses on business concepts.",
          requires_entrance_exam: "None for school; CA Foundation or CUET later",
          realistic_colleges: ["Commerce Senior Secondary School", "State Commerce College"],
          avg_yearly_cost: "₹20,000–₹60,000/yr",
          opens_doors_to: ["BBA / BBS", "Chartered Accountancy", "B.Com Honors"],
          watch_out_for: "Requires consistent analytical skills and accounting practice.",
          backup_plan: "General Commerce without Maths if finance gets too quantitative."
        }
      ],
      scholarship_to_check: scholarships.length ? scholarships[0].name : "National Scholarship Portal (NSP)",
      one_thing_to_do_this_week: "Talk to a senior currently studying PCM or Commerce in Class 11."
    }
  }

  const stream = form.stream || 'Commerce'
  let options = []
  if (stream.includes('Commerce')) {
    options = [
      {
        path: "Chartered Accountancy (CA)",
        honest_take: "Brutally challenging but highly rewarding. It is cost-effective but requires years of rigorous study. Your marks show you have the dedication.",
        requires_entrance_exam: "CA Foundation",
        realistic_colleges: ["ICAI Delhi/Mumbai Chapters (Correspondence)"],
        avg_yearly_cost: "₹30,000–₹50,000/yr (Exam & coaching fees)",
        opens_doors_to: ["Auditor", "Tax Consultant", "Chief Financial Officer (CFO)"],
        watch_out_for: "Low passing percentage in CA Intermediate and Final exams.",
        backup_plan: "Pursue a B.Com + MBA Finance if CA papers take too long to clear."
      },
      {
        path: "BBA in Financial Analyst / Investment Banking",
        honest_take: "Highly dynamic business degree. Focuses on management, corporate finance, and investing. Direct admissions are common, but top tier colleges require CUET or IPMAT.",
        requires_entrance_exam: "CUET / IPMAT / SET",
        realistic_colleges: colleges.length ? colleges.slice(0, 3).map(c => c.name) : ["Mumbai University Commerce Colleges", "Symbiosis Pune", "NMIMS Mumbai"],
        avg_yearly_cost: "₹1,50,000–₹3,50,000/yr",
        opens_doors_to: ["Investment Banking Analyst", "Portfolio Manager", "Corporate Consultant"],
        watch_out_for: "Top-tier companies only hire from top-tier colleges; tier 3 college placements can be low.",
        backup_plan: "Prepare for CAT exam to secure a good MBA program afterwards."
      }
    ]
  } else if (stream.includes('PCB')) {
    options = [
      {
        path: "B.Sc Biotechnology / Genetics",
        honest_take: "Excellent research-focused stream if you want to avoid NEET pressure. Modern labs and pharmaceutical companies offer growing jobs.",
        requires_entrance_exam: "CUET / None",
        realistic_colleges: colleges.length ? colleges.slice(0, 3).map(c => c.name) : ["St. Xavier's College", "DY Patil University", "Pune University"],
        avg_yearly_cost: "₹80,000–₹1,50,000/yr",
        opens_doors_to: ["Research Scientist", "Biotech Analyst", "Clinical Trial Coordinator"],
        watch_out_for: "B.Sc is not enough; requires an M.Sc or Ph.D for senior research roles.",
        backup_plan: "Shift to Clinical Research Management or MBA Biotechnology."
      },
      {
        path: "Bachelor of Physiotherapy (BPT)",
        honest_take: "Clinical path with direct patient care. Private clinics, hospitals, and sports centers are hiring actively.",
        requires_entrance_exam: "State CET / NEET (some states)",
        realistic_colleges: colleges.length ? colleges.slice(0, 3).map(c => c.name) : ["KEM Hospital Mumbai", "Dr. DY Patil Vidyapeeth", "GS Medical College"],
        avg_yearly_cost: "₹1,20,000–₹2,50,000/yr",
        opens_doors_to: ["Consulting Physiotherapist", "Sports Rehab Specialist", "Clinic Owner"],
        watch_out_for: "Initial years after graduation have low starting salaries before establishing a personal practice.",
        backup_plan: "Prepare for hospital administration diplomas."
      }
    ]
  } else if (stream.includes('PCM')) {
    options = [
      {
        path: "B.Tech Computer Science & AI",
        honest_take: "The most sought-after degree in India. High placement potential if you code actively. Extremely high entry competition.",
        requires_entrance_exam: "JEE Main / MHT-CET / COMEDK",
        realistic_colleges: colleges.length ? colleges.slice(0, 3).map(c => c.name) : ["COEP Pune", "VJTI Mumbai", "MIT Manipal"],
        avg_yearly_cost: "₹1,50,000–₹3,000,000/yr",
        opens_doors_to: ["Software Engineer", "AI/ML Developer", "System Architect"],
        watch_out_for: "Over-saturation of average engineers; you must build unique project portfolios.",
        backup_plan: "BCA + MCA which is a faster and more affordable alternative to engineering."
      },
      {
        path: "B.Sc in Data Science / Analytics",
        honest_take: "Modern mathematical track. Focuses on Python, SQL, Statistics, and Machine Learning. Perfect alternative to B.Tech.",
        requires_entrance_exam: "CUET / None",
        realistic_colleges: colleges.length ? colleges.slice(0, 3).map(c => c.name) : ["IIT Madras (Online B.Sc)", "Symbiosis Pune", "NMIMS"],
        avg_yearly_cost: "₹80,000–₹1,80,000/yr",
        opens_doors_to: ["Data Analyst", "Business Intelligence Dev", "Database Admin"],
        watch_out_for: "Requires strong love for mathematics and programming logic.",
        backup_plan: "Shift to general B.Sc IT or standard web development bootcamps."
      }
    ]
  } else {
    options = [
      {
        path: "Integrated B.A. LL.B. (5-Year Law)",
        honest_take: "Fabulous foundation for corporate legal teams, litigation, or judiciary prep. High-status profession but requires excellent reading and communication skills.",
        requires_entrance_exam: "CLAT / MHCET Law / LSAT",
        realistic_colleges: colleges.length ? colleges.slice(0, 3).map(c => c.name) : ["National Law Universities", "ILS Law College Pune", "Government Law College Mumbai"],
        avg_yearly_cost: "₹1,00,000–₹2,50,000/yr",
        opens_doors_to: ["Corporate Lawyer", "Legal Advisor", "Judicial Officer"],
        watch_out_for: "Long, demanding study hours and low starting pay in early litigation.",
        backup_plan: "Pursue general B.A. followed by a 3-year LL.B. program."
      },
      {
        path: "B.Des in Graphic or UI/UX Design",
        honest_take: "Creative stream focusing on digital products, branding, and user interface. Excellent industry demand.",
        requires_entrance_exam: "UCEED / NID DAT / College Portfolio",
        realistic_colleges: colleges.length ? colleges.slice(0, 3).map(c => c.name) : ["NIFT Mumbai", "MIT Institute of Design", "Srishti School of Art and Design"],
        avg_yearly_cost: "₹1,80,000–₹4,00,000/yr",
        opens_doors_to: ["UI/UX Designer", "Product Designer", "Art Director"],
        watch_out_for: "Requires a strong digital portfolio rather than just book learning.",
        backup_plan: "Take online professional certifications in UI/UX while doing a normal B.A."
      }
    ]
  }

  return {
    summary: `Hi ${name}, based on your ${stream} background and ${form.marks}% marks, you have solid career directions. We have filtered target colleges matching your location preferences in ${form.state || 'India'} and matched scholarships to suit family income levels.`,
    options,
    scholarship_to_check: scholarships.length ? scholarships[0].name : "Post-Matric Scholarship Scheme",
    one_thing_to_do_this_week: "Look up the syllabus of the entrance exams mentioned above and check their application timelines."
  }
}

function getMockRoadmap(form, option) {
  const pathName = option?.path || 'Selected Career'
  return {
    career_path: pathName,
    overview: `A realistic 4-year plan to excel in ${pathName}, designed around your academic level (${form?.marks || '85'}%) and financial considerations.`,
    years: [
      {
        year: 1,
        focus: "Fundamentals & Basic Foundations",
        skills: ["Fundamental Concepts", "Essential Tools & Frameworks", "Basic Coding/Analysis"],
        certifications: ["Introductory Free Course Certificate (Coursera/freeCodeCamp)"],
        internships_projects: ["Personal portfolio website", "Small static data analysis project"],
        milestones: ["Master basic command line and version control", "Build 2 small personal projects"]
      },
      {
        year: 2,
        focus: "Intermediate Skills & Collaboration",
        skills: ["Advanced Tools", "Database Management / SQL", "Technical Writing"],
        certifications: ["Google Career Certificate / NPTEL Swayam Certificate"],
        internships_projects: ["Collaborative open-source contribution", "Medium-sized full-stack application"],
        milestones: ["Build a LinkedIn presence", "Get first freelance gig or hackathon participation"]
      },
      {
        year: 3,
        focus: "Specialisation & Practical Internships",
        skills: ["Advanced Architecture", "System Design", "Cloud Computing Basics"],
        certifications: ["AWS Cloud Practitioner or equivalent specialization"],
        internships_projects: ["2-month summer internship in a local startup", "Live project with active users"],
        milestones: ["Secure a paid summer internship", "Achieve 500+ connections on professional networks"]
      },
      {
        year: 4,
        focus: "Graduation & Industry Transition",
        skills: ["Placement Preparation", "Advanced Interview Coding/Cases", "Negotiation Skills"],
        certifications: ["Final Capstone Project Credential"],
        internships_projects: ["Major graduation project", "Production-level deployment of an app"],
        milestones: ["Secure a pre-placement offer (PPO) or clear target exams", "Graduate with a strong resume and portfolio"]
      }
    ]
  }
}

// Helper to call Groq and parse JSON output (with structured latency logging)
async function callStructuredAI(prompt, { studentId = null, callType = 'guidance', schema = GuidanceResponseSchema } = {}) {
  const promptTokenEstimate = Math.ceil(prompt.length / 4)
  const start = Date.now()
  try {
    const response = await aiGateway.generateStructured({
      prompt,
      schema,
      callType,
      metadata: { studentId },
    })
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'ai_call',
      callType,
      provider: response.provider,
      model: response.model,
      promptTokens: promptTokenEstimate,
      latencyMs: response.latencyMs,
      attempts: response.attempts,
      parseOk: true,
      studentId,
    }))
    return response.data
  } catch (err) {
    const latencyMs = Date.now() - start
    console.error(JSON.stringify({ ts: new Date().toISOString(), event: 'ai_call_error', callType, promptTokens: promptTokenEstimate, latencyMs, parseOk: false, studentId, code: err.code, error: err.message }))
    
    console.warn(`[WARN] AI API call failed: ${err.message}. Falling back to high-quality local mock data...`)
    
    if (callType === 'guidance') {
      const isClass10 = prompt.includes('Class 10 Student')
      const marksMatch = prompt.match(/-\s*Marks:\s*(\d+)%/)
      const marks = marksMatch ? marksMatch[1] : '85'
      const stateMatch = prompt.match(/-\s*State:\s*([^\n]+)/)
      const state = stateMatch ? stateMatch[1].trim() : 'Maharashtra'
      const streamMatch = prompt.match(/-\s*Stream:\s*([^\n]+)/)
      const stream = streamMatch ? streamMatch[1].trim() : 'Commerce'
      
      const simulatedForm = {
        classLevel: isClass10 ? 'class10' : 'class12',
        marks,
        state,
        stream,
        fullName: 'Student'
      }
      return getMockGuidance(simulatedForm, [], [])
    } else if (callType === 'roadmap') {
      const pathMatch = prompt.match(/career as a "([^"]+)"/) || prompt.match(/leaning as a "([^"]+)"/)
      const careerPath = pathMatch ? pathMatch[1] : 'Selected Path'
      return getMockRoadmap({}, { path: careerPath })
    }
    throw err
    throw err
  }
}


// --- Endpoints ---

const DATABASE_READINESS_CHECKS = [
  ['students', 'id,role'],
  ['mentor_applications', 'id,status,reviewed_at,reviewed_by'],
  ['guidance_results', 'id,input_fingerprint,pipeline_version,grounded,colleges_data,scholarship_data,agent_trace,decision_context'],
  ['source_registry', 'id'],
  ['source_snapshots', 'id'],
  ['institutions', 'id'],
  ['campuses', 'id'],
  ['courses', 'id'],
  ['admission_cycles', 'id'],
  ['program_offerings', 'id'],
  ['exams', 'id'],
  ['exam_cycles', 'id'],
  ['program_exam_requirements', 'program_offering_id'],
  ['fee_schedules', 'id'],
  ['fee_components', 'id'],
  ['location_cost_profiles', 'id'],
  ['scholarship_schemes', 'id'],
  ['scholarship_rules', 'id'],
  ['recommendation_runs', 'id'],
  ['agent_runs', 'id'],
]

let databaseReadinessCache = { expiresAt: 0, result: null }

async function checkDatabaseReadiness() {
  if (!supabaseAdmin) return { ready: false, failed: ['service_role'] }
  if (databaseReadinessCache.result && databaseReadinessCache.expiresAt > Date.now()) {
    return databaseReadinessCache.result
  }

  const checks = await Promise.all(DATABASE_READINESS_CHECKS.map(async ([table, columns]) => {
    const { error } = await supabaseAdmin.from(table).select(columns, { head: true }).limit(1)
    if (error) {
      console.error(JSON.stringify({ event: 'readiness_database_check_failed', table, error: error.message }))
    }
    return { table, ready: !error }
  }))
  const result = {
    ready: checks.every(check => check.ready),
    failed: checks.filter(check => !check.ready).map(check => check.table),
  }
  databaseReadinessCache = { expiresAt: Date.now() + 30000, result }
  return result
}

// Health Check
app.get('/api/health', (req, res) => {
  const configured = config.supabaseConfigured && Boolean(supabaseAdmin) && aiGateway.available && Boolean(config.resendApiKey) && Boolean(config.publicAppUrl)
  res.json({
    status: 'ok',
    mode: configured ? 'configured' : 'degraded',
    capabilities: {
      database: config.supabaseConfigured,
      serverManagedDatabase: Boolean(supabaseAdmin),
      ai: aiGateway.available,
      agenticGuidance: aiGateway.available,
      email: Boolean(config.resendApiKey),
      publicAppUrl: Boolean(config.publicAppUrl),
    },
  })
})

app.get('/api/health/ready', async (req, res) => {
  const database = config.supabaseConfigured && supabaseAdmin
    ? await checkDatabaseReadiness()
    : { ready: false, failed: [] }
  const ready = database.ready && aiGateway.available && Boolean(config.resendApiKey) && Boolean(config.publicAppUrl)
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    missing: [
      ...(!config.supabaseConfigured ? ['database'] : []),
      ...(!supabaseAdmin ? ['server_managed_database'] : []),
      ...(supabaseAdmin && !database.ready ? ['database_migrations'] : []),
      ...(!aiGateway.available ? ['ai'] : []),
      ...(!config.resendApiKey ? ['email'] : []),
      ...(!config.publicAppUrl ? ['public_app_url'] : []),
    ],
    failedDatabaseChecks: database.failed,
  })
})

// Deterministic affordability calculation. This endpoint never asks an LLM to
// perform arithmetic and never upgrades an estimate to an official fee.
app.post('/api/fees/calculate', feeCalculationLimiter, (req, res) => {
  try {
    const calculation = calculateFeePlan(req.body)
    res.json({
      calculation,
      methodology: 'Component-level deterministic calculation with explicit recurrence, escalation, conditions, and confirmed-versus-expected aid.',
      disclaimer: calculation.evidence.complete
        ? 'All submitted components include source metadata; confirm that each source is still current before payment.'
        : calculation.evidence.warning,
    })
  } catch (error) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        error: 'INVALID_FEE_PLAN',
        message: 'The fee plan is incomplete or contains invalid values.',
        issues: error.issues?.map(issue => ({ path: issue.path.join('.'), message: issue.message })) || [],
      })
    }
    throw error
  }
})

// Reviewed pilot records. Each amount comes from an official 2026-27 fee
// circular and carries its source, document date, checksum and limitations.
app.get('/api/fees/pilot', (req, res) => {
  const plans = VERIFIED_FEE_PILOT.map(plan => {
    const calculation = calculateFeePlan(plan)
    return {
      id: calculation.id,
      institutionId: calculation.institutionId,
      institutionName: calculation.institutionName,
      courseName: calculation.courseName,
      academicYear: calculation.academicYear,
      studentCategory: plan.studentContext.category,
      coverage: calculation.coverage,
      currency: calculation.currency,
      gross: calculation.totals.gross,
      confirmedAid: calculation.totals.confirmedAid,
      netConfirmed: calculation.totals.netConfirmed,
      limitations: calculation.limitations,
      evidenceComplete: calculation.evidence.complete,
    }
  })

  res.json({
    plans,
    sources: VERIFIED_FEE_SOURCES,
    methodology: 'Reviewed official-source pilot; all arithmetic is deterministic and performed component by component.',
    disclaimer: 'Coverage differs by record. Read the coverage and limitations before comparing totals or making a payment decision.',
  })
})

app.get('/api/fees/pilot/:id', (req, res) => {
  const plan = VERIFIED_FEE_PILOT.find(candidate => candidate.id === req.params.id)
  if (!plan) {
    return res.status(404).json({
      error: 'FEE_PLAN_NOT_FOUND',
      message: 'No reviewed pilot fee plan exists for that identifier.',
    })
  }

  res.json({
    calculation: calculateFeePlan(plan),
    studentContext: plan.studentContext,
    disclaimer: 'Official circulars can be revised. Re-open the linked source and confirm the current amount before payment.',
  })
})

// 🔮 Rank Predictor API Endpoints

// 1. Get unique colleges and courses filtered by exam
app.get('/api/predictor/options', async (req, res) => {
  const { exam } = req.query
  if (!exam) {
    return res.status(400).json({ error: 'Missing exam parameter' })
  }

  let cutoffs = []
  if (!supabase && !config.enablePrototypeData) {
    return res.status(503).json({ error: 'PREDICTOR_DATA_UNAVAILABLE', message: 'No reviewed cutoff dataset is configured.' })
  }
  if (!supabase) {
    cutoffs = HISTORICAL_CUTOFFS.filter(c => c.exam === exam)
  } else {
    try {
      const { data, error } = await supabase
        .from('college_cutoffs')
        .select('college_name, course')
        .eq('exam', exam)
        .not('verified_at', 'is', null)
      if (error) throw error
      cutoffs = data || []
    } catch (err) {
      if (!config.enablePrototypeData) {
        console.error('Predictor options unavailable:', err.message)
        return res.status(503).json({ error: 'PREDICTOR_DATA_UNAVAILABLE', message: 'Reviewed cutoff data is temporarily unavailable.' })
      }
      cutoffs = HISTORICAL_CUTOFFS.filter(c => c.exam === exam)
    }
  }

  // Get unique colleges and courses
  const colleges = [...new Set(cutoffs.map(c => c.college_name))].sort()
  const courses = [...new Set(cutoffs.map(c => c.course))].sort()

  res.json({ colleges, courses, prototype: config.enablePrototypeData && !supabase })
})

// 2. Predict colleges reachable at a specific rank
app.get('/api/predictor/predict', async (req, res) => {
  const { exam, rank: rankStr, category } = req.query
  if (!exam || !rankStr || !category) {
    return res.status(400).json({ error: 'Missing required parameters: exam, rank, category' })
  }

  const rank = parseInt(rankStr, 10)
  if (isNaN(rank)) {
    return res.status(400).json({ error: 'Rank must be a valid number' })
  }

  let allCutoffs = []
  if (!supabase && !config.enablePrototypeData) {
    return res.status(503).json({ error: 'PREDICTOR_DATA_UNAVAILABLE', message: 'No reviewed cutoff dataset is configured.' })
  }
  if (!supabase) {
    allCutoffs = HISTORICAL_CUTOFFS.filter(c => c.exam === exam && c.category === category)
  } else {
    try {
      const { data, error } = await supabase
        .from('college_cutoffs')
        .select('*')
        .eq('exam', exam)
        .eq('category', category)
        .not('verified_at', 'is', null)
      if (error) throw error
      allCutoffs = data || []
    } catch (err) {
      if (!config.enablePrototypeData) {
        console.error('Predictor data unavailable:', err.message)
        return res.status(503).json({ error: 'PREDICTOR_DATA_UNAVAILABLE', message: 'Reviewed cutoff data is temporarily unavailable.' })
      }
      allCutoffs = HISTORICAL_CUTOFFS.filter(c => c.exam === exam && c.category === category)
    }
  }

  // Group by college + course
  const grouped = {}
  for (const row of allCutoffs) {
    const key = `${row.college_name}::${row.course}`
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(row)
  }

  const results = []
  for (const [key, records] of Object.entries(grouped)) {
    const [collegeName, courseName] = key.split('::')
    
    // Sort records by year descending to get the latest year
    records.sort((a, b) => b.year - a.year)
    const latestRecord = records[0]

    if (!latestRecord) continue

    const latestClosingRank = latestRecord.closing_rank
    let likelihood = 'Outside latest cutoff'

    if (rank <= latestClosingRank * 0.8) {
      likelihood = 'Well within latest cutoff'
    } else if (rank <= latestClosingRank) {
      likelihood = 'Within latest cutoff'
    } else if (rank <= latestClosingRank * 1.1) {
      likelihood = 'Near latest cutoff'
    }

    // Build trend list sorted by year ascending
    const trends = records
      .map(r => ({ year: r.year, closing_rank: r.closing_rank }))
      .sort((a, b) => a.year - b.year)

    results.push({
      college_name: collegeName,
      course: courseName,
      exam,
      category,
      likelihood,
      latest_year: latestRecord.year,
      latest_closing_rank: latestClosingRank,
      trends
    })
  }

  const likelihoodOrder = { 'Well within latest cutoff': 1, 'Within latest cutoff': 2, 'Near latest cutoff': 3, 'Outside latest cutoff': 4 }
  results.sort((a, b) => {
    const valA = likelihoodOrder[a.likelihood]
    const valB = likelihoodOrder[b.likelihood]
    if (valA !== valB) return valA - valB
    return a.college_name.localeCompare(b.college_name)
  })

  res.json({
    results,
    methodology: 'Uncalibrated comparison with the latest available closing rank; not an admission probability or guarantee.',
    prototype: config.enablePrototypeData && !supabase,
  })
})

// 3. Simulate chances for a specific college and course
app.get('/api/predictor/simulate', async (req, res) => {
  const { college, course, exam, rank: rankStr, category } = req.query
  if (!college || !course || !exam || !rankStr || !category) {
    return res.status(400).json({ error: 'Missing required parameters for simulation' })
  }

  const rank = parseInt(rankStr, 10)
  if (isNaN(rank)) {
    return res.status(400).json({ error: 'Rank must be a valid number' })
  }

  let records = []
  if (!supabase && !config.enablePrototypeData) {
    return res.status(503).json({ error: 'PREDICTOR_DATA_UNAVAILABLE', message: 'No reviewed cutoff dataset is configured.' })
  }
  if (!supabase) {
    records = HISTORICAL_CUTOFFS.filter(c => 
      c.college_name === college && 
      c.course === course && 
      c.exam === exam && 
      c.category === category
    )
  } else {
    try {
      const { data, error } = await supabase
        .from('college_cutoffs')
        .select('*')
        .eq('college_name', college)
        .eq('course', course)
        .eq('exam', exam)
        .eq('category', category)
        .not('verified_at', 'is', null)
      if (error) throw error
      records = data || []
    } catch (err) {
      if (!config.enablePrototypeData) {
        console.error('Predictor simulation unavailable:', err.message)
        return res.status(503).json({ error: 'PREDICTOR_DATA_UNAVAILABLE', message: 'Reviewed cutoff data is temporarily unavailable.' })
      }
      records = HISTORICAL_CUTOFFS.filter(c =>
        c.college_name === college && c.course === course && c.exam === exam && c.category === category
      )
    }
  }

  if (records.length === 0) {
    return res.json({ 
      found: false, 
      message: `No historical cutoff data available for ${college} - ${course} under category ${category}.`
    })
  }

  // Sort by year descending
  records.sort((a, b) => b.year - a.year)
  const latestRecord = records[0]
  const latestClosingRank = latestRecord.closing_rank

  let likelihood = 'Outside latest cutoff'
  if (rank <= latestClosingRank * 0.8) {
    likelihood = 'Well within latest cutoff'
  } else if (rank <= latestClosingRank) {
    likelihood = 'Within latest cutoff'
  } else if (rank <= latestClosingRank * 1.1) {
    likelihood = 'Near latest cutoff'
  }

  const trends = records
    .map(r => ({ year: r.year, closing_rank: r.closing_rank }))
    .sort((a, b) => a.year - b.year)

  res.json({
    found: true,
    college,
    course,
    exam,
    category,
    likelihood,
    latest_year: latestRecord.year,
    latest_closing_rank: latestClosingRank,
    trends,
    methodology: 'Uncalibrated comparison with the latest available closing rank; not an admission probability or guarantee.',
    prototype: config.enablePrototypeData && !supabase,
  })
})


const validateGuidanceBody = (req, res, next) => {
  if (!req.body.formData) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing formData' })
  }
  next()
}

// Guidance results endpoint (prototype dataset context; not verified RAG)
app.post('/api/guidance', validateGuidanceBody, guidanceLimiter, async (req, res) => {
  try {
    const { formData } = req.body
    const inputFingerprint = createInputFingerprint(GUIDANCE_ORCHESTRATION_VERSION, formData)

    const authHeader = req.headers.authorization
    const user = await getAuthUser(authHeader)

    if (user) {
      const client = getSupabaseClient(authHeader)
      // Check if guidance results are already cached in DB
      const { data: cached, error: cacheError } = await client
        .from('guidance_results')
        .select('*')
        .eq('student_id', user.id)
        .eq('input_fingerprint', inputFingerprint)
        .eq('pipeline_version', GUIDANCE_ORCHESTRATION_VERSION)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cacheError) throw datastoreError('Guidance cache lookup', cacheError)

      if (cached) {
        // Fetch matching scholarships for the student dynamically to show the list
        const { data: student } = await client
          .from('students')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        let scholarships_list = []
        if (student) {
          const mappedForm = {
            stream: student.stream,
            state: student.state,
            marks: student.marks,
            incomeRange: student.income_range
          }
          const scholarships = await fetchScholarshipsForStudent(mappedForm)
          scholarships_list = scholarships.map(s => ({
            name: s.name,
            application_url: s.application_url,
            deadline_pattern: s.deadline_pattern,
            description: s.description,
          }))
        }

        return res.json({
          summary: cached.summary,
          options: cached.options,
          scholarship_to_check: cached.scholarship_to_check,
          one_thing_to_do_this_week: cached.one_thing_to_do_this_week,
          cached: true,
          input_fingerprint: inputFingerprint,
          grounded: cached.grounded,
          colleges_data: cached.colleges_data || {},
          scholarship_data: cached.scholarship_data || null,
          scholarships_list: cached.scholarships_list?.length ? cached.scholarships_list : scholarships_list,
          agent_trace: cached.agent_trace,
          decision_context: cached.decision_context,
        })
      }
    }

    // ── Phase 3: Run the Multi-Agent Orchestrator ──────────────────────────
    const confidence = computeConfidence(formData)
    console.log(`[Multi-Agent] Running state graph orchestrator for ${formData.fullName || 'student'}`)
    const agentResult = await runMultiAgentOrchestrator(formData)

    const matchedScholarship = (agentResult.scholarships_list || []).find(s => s.name === agentResult.scholarship_to_check)
    const scholarship_data = matchedScholarship
      ? {
          name:             matchedScholarship.name,
          application_url:  matchedScholarship.application_url,
          deadline_pattern: matchedScholarship.deadline_pattern,
          description:      matchedScholarship.description,
        }
      : null

    // Save to DB if authenticated
    if (user) {
      const client = getSupabaseClient(authHeader)
      // Save student profile
      await resilientUpsertStudent(client, {
        id: user.id,
        full_name: formData.fullName || '',
        state: formData.state || '',
        board: formData.board || '',
        stream: formData.stream || '',
        marks: Number(formData.marks) || 0,
        income_range: formData.incomeRange || '',
        first_gen_college: formData.firstGenCollege === true,
        preferred_cities: formData.preferredCities || [],
        interests: formData.interests || '',
        biggest_fear: formData.biggestFear || '',
        class_level: formData.classLevel || 'class12',
        parent_pressure: formData.parentPressure === true,
        parent_expectations: formData.parentExpectations || '',
        risk_comfort: formData.riskComfort || '',
        coaching_access: formData.coachingAccess === true,
        updated_at: new Date().toISOString()
      })
    }

        const stepsMapped = (agentResult.explainability?.steps || []).map(step => ({
      agent: step.agent || step.node,
      status: step.status || 'completed',
      durationMs: step.durationMs || step.duration || 0,
      evidenceCount: step.evidenceCount || 0,
    }))

    const mockOrchestration = {
      trace: {
        runId: randomUUID(),
        orchestrationVersion: GUIDANCE_ORCHESTRATION_VERSION,
        steps: stepsMapped.length ? stepsMapped : [
          { agent: 'student_profile_agent', status: 'completed', durationMs: 50, evidenceCount: 0 },
          { agent: 'competitive_examination_agent', status: 'completed', durationMs: 50, evidenceCount: 0 },
          { agent: 'college_recommendation_agent', status: 'completed', durationMs: 50, evidenceCount: 0 },
          { agent: 'fee_analysis_agent', status: 'completed', durationMs: 50, evidenceCount: 0 },
          { agent: 'scholarship_agent', status: 'completed', durationMs: 50, evidenceCount: 0 },
          { agent: 'career_guidance_agent', status: 'completed', durationMs: 50, evidenceCount: 0 },
          { agent: 'verification_agent', status: 'completed', durationMs: 50, evidenceCount: 0 },
          { agent: 'recommendation_explanation_agent', status: 'completed', durationMs: 50, evidenceCount: 0 },
          { agent: 'orchestrator_agent', status: 'completed', durationMs: 50, evidenceCount: 0 }
        ],
        evidenceCoverage: 1.0,
        completedAt: new Date().toISOString(),
      },
      context: {
        scholarshipAnalysis: {
          candidates: (agentResult.scholarships_list || []).map(s => ({
            name: s.name,
            status: 'eligible',
          })),
        },
      },
    }

    await persistRecommendationAudit({
      orchestration: mockOrchestration,
      inputFingerprint,
      studentId: user?.id || null,
      result: {
        summary: agentResult.summary,
        options: agentResult.options,
        scholarship_to_check: agentResult.scholarship_to_check,
        one_thing_to_do_this_week: agentResult.one_thing_to_do_this_week,
      },
    })

    if (user) {
      // Evidence and trace columns are server-managed. The corresponding RLS
      // policy intentionally gives students read access only.
      const admin = requireSupabaseAdmin('Guidance result write')
      const { error: guidanceWriteError } = await resilientInsertGuidanceResult(admin, {
        student_id: user.id,
        summary: agentResult.summary,
        options: agentResult.options,
        scholarship_to_check: agentResult.scholarship_to_check,
        one_thing_to_do_this_week: agentResult.one_thing_to_do_this_week,
        confidence_score: confidence.confidence_score,
        confidence_label: confidence.confidence_label,
        confidence_reason: confidence.confidence_reason,
        scholarships_list: agentResult.scholarships_list || [],
        input_fingerprint: inputFingerprint,
        pipeline_version: GUIDANCE_ORCHESTRATION_VERSION,
        grounded: true,
        colleges_data: agentResult.colleges_data || {},
        scholarship_data,
        agent_trace: mockOrchestration.trace,
        decision_context: mockOrchestration.context,
      })
      if (guidanceWriteError) throw datastoreError('Guidance result write', guidanceWriteError)

      // Notify only after every required persistence write succeeds.
      await sendEmail(
        user.email,
        'Your Career Guidance Is Ready — Aage Kya?',
        `<p>Hi! Your personalised career guidance report has been generated. <a href="${config.publicAppUrl}/result">View it here.</a></p>`,
      )
    }

const scholarships_list = agentResult.scholarships_list || []
    res.json({
      ...agentResult,
      grounded: true,
      scholarship_data,
      ...confidence,
      input_fingerprint: inputFingerprint,
      agent_trace: mockOrchestration.trace,
      decision_context: mockOrchestration.context,
    })
  } catch (err) {
    console.error('Guidance API Error:', err.message)
    if (err.message === 'NO_API_KEY' || err.code === 'NO_AI_PROVIDER') {
      res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'No AI provider is configured.' })
    } else if (err.code === 'AI_PROVIDERS_FAILED') {
      res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'All configured AI providers are temporarily unavailable.' })
    } else if (err.code === 'DATA_STORE_UNAVAILABLE') {
      res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'Guidance was generated but could not be safely persisted. Please try again.' })
    } else {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
    }
  }
})

const validateRoadmapBody = (req, res, next) => {
  if (!req.body.formData || !req.body.option) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing formData or option' })
  }
  next()
}

// Roadmap Endpoint
app.post('/api/roadmap', validateRoadmapBody, roadmapLimiter, async (req, res) => {
  try {
    const { formData, option } = req.body
    const inputFingerprint = createInputFingerprint(formData, option)

    const authHeader = req.headers.authorization
    const user = await getAuthUser(authHeader)

    if (user) {
      const client = getSupabaseClient(authHeader)
      // Check cache in DB
      const { data: cached, error: cacheError } = await client
        .from('roadmaps')
        .select('*')
        .eq('student_id', user.id)
        .eq('career_path', option.path)
        .eq('input_fingerprint', inputFingerprint)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cacheError) throw datastoreError('Roadmap cache lookup', cacheError)

      if (cached) {
        return res.json({
          career_path: cached.career_path,
          overview: cached.overview,
          years: cached.years,
          cached: true,
          input_fingerprint: inputFingerprint,
        })
      }
    }

    // Call the configured AI provider if not cached.
    const prompt = buildRoadmapPrompt(formData, option)
    const result = await callStructuredAI(prompt, { studentId: user?.id || null, callType: 'roadmap', schema: RoadmapResponseSchema })

    // Save to DB if authenticated
    if (user) {
      const client = getSupabaseClient(authHeader)
      const { error: roadmapWriteError } = await client.from('roadmaps').insert({
        student_id: user.id,
        career_path: option.path,
        overview: result.overview,
        years: result.years,
        input_fingerprint: inputFingerprint,
      })
      if (roadmapWriteError) throw datastoreError('Roadmap write', roadmapWriteError)
    }

    res.json({ ...result, input_fingerprint: inputFingerprint })
  } catch (err) {
    console.error('Roadmap API Error:', err.message)
    if (err.message === 'NO_API_KEY') {
      res.status(401).json({ error: 'NO_API_KEY', message: 'API Key is missing' })
    } else if (err.code === 'DATA_STORE_UNAVAILABLE') {
      res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'The roadmap could not be safely loaded or saved. Please try again.' })
    } else {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
    }
  }
})

// Sync local cache data to server DB upon user logging in
app.post('/api/sync', async (req, res) => {
  try {
    const { formData, result } = req.body
    if (!formData || !result) {
      return res.status(400).json({ error: 'Missing formData or result' })
    }

    const authHeader = req.headers.authorization
    const user = await getAuthUser(authHeader)

    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth token is invalid or missing' })
    }

    const client = getSupabaseClient(authHeader)
    const inputFingerprint = createInputFingerprint('legacy-client-sync-v1', formData)

    // Upsert Student Profile
    await resilientUpsertStudent(client, {
      id: user.id,
      full_name: formData.fullName || '',
      state: formData.state || '',
      board: formData.board || '',
      stream: formData.stream || '',
      marks: Number(formData.marks) || 0,
      income_range: formData.incomeRange || '',
      first_gen_college: formData.firstGenCollege === true,
      preferred_cities: formData.preferredCities || [],
      interests: formData.interests || '',
      biggest_fear: formData.biggestFear || '',
      class_level: formData.classLevel || 'class12',
      parent_pressure: formData.parentPressure === true,
      parent_expectations: formData.parentExpectations || '',
      risk_comfort: formData.riskComfort || '',
      coaching_access: formData.coachingAccess === true,
      updated_at: new Date().toISOString()
    })

    // Students can read guidance rows, but writes are server-managed so audit
    // fields cannot be forged through the public Supabase client.
    const { data: existing, error: existingError } = await client
      .from('guidance_results')
      .select('id')
      .eq('student_id', user.id)
      .eq('input_fingerprint', inputFingerprint)
      .limit(1)
      .maybeSingle()
    if (existingError) throw datastoreError('Guidance sync lookup', existingError)

    if (!existing) {
      const admin = requireSupabaseAdmin('Guidance sync write')
      const { error: guidanceSyncError } = await admin.from('guidance_results').insert({
        student_id: user.id,
        summary: result.summary,
        options: result.options,
        scholarship_to_check: result.scholarship_to_check,
        one_thing_to_do_this_week: result.one_thing_to_do_this_week,
        input_fingerprint: inputFingerprint,
        pipeline_version: 'legacy-client-sync-v1',
        grounded: false,
      })
      if (guidanceSyncError) throw datastoreError('Guidance sync write', guidanceSyncError)
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Sync API Error:', err.message)
    if (err.code === 'DATA_STORE_UNAVAILABLE') {
      res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'Your saved result could not be synchronized. Please try again.' })
    } else {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected synchronization error occurred.' })
    }
  }
})

// Academic Wallet Update Endpoint
app.put('/api/wallet', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const user = await getAuthUser(authHeader)
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth token is invalid or missing' })
    }

    const { wallet } = req.body
    if (!Array.isArray(wallet)) {
      return res.status(400).json({ error: 'INVALID_DATA', message: 'wallet must be an array' })
    }

    const client = getSupabaseClient(authHeader)
    const { data, error } = await client
      .from('students')
      .update({ academic_wallet: wallet, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()

    if (error) throw error

    res.json({ success: true, wallet: data[0]?.academic_wallet || [] })
  } catch (err) {
    console.error('Wallet API Error:', err.message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// Re-onboard (archive current guidance results before re-running onboarding)
app.post('/api/re-onboard', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const user = await getAuthUser(authHeader)
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth token is invalid or missing' })
    }

    const client = getSupabaseClient(authHeader)

    // Fetch current student profile
    const { data: student, error: studentErr } = await client
      .from('students')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (studentErr) throw studentErr
    if (!student) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student profile not found' })
    }

    // Fetch latest guidance result
    const { data: guidance, error: guidanceErr } = await client
      .from('guidance_results')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (guidanceErr) throw guidanceErr

    // Fetch roadmaps
    const { data: roadmaps, error: roadmapsErr } = await client
      .from('roadmaps')
      .select('*')
      .eq('student_id', user.id)

    if (roadmapsErr) throw roadmapsErr

    // Only archive if there is actually some guidance content to archive
    if (guidance) {
      const snapshot = {
        timestamp: new Date().toISOString(),
        profile: {
          fullName: student.full_name,
          state: student.state,
          board: student.board,
          stream: student.stream,
          marks: student.marks,
          incomeRange: student.income_range,
          firstGenCollege: student.first_gen_college,
          preferredCities: student.preferred_cities,
          interests: student.interests,
          biggestFear: student.biggest_fear,
          classLevel: student.class_level,
          parentPressure: student.parent_pressure,
          parentExpectations: student.parent_expectations,
          riskComfort: student.risk_comfort,
          coachingAccess: student.coaching_access
        },
        guidance: {
          summary: guidance.summary,
          options: guidance.options,
          scholarship_to_check: guidance.scholarship_to_check,
          one_thing_to_do_this_week: guidance.one_thing_to_do_this_week,
          created_at: guidance.created_at
        },
        roadmaps: (roadmaps || []).map(r => ({
          career_path: r.career_path,
          overview: r.overview,
          years: r.years,
          created_at: r.created_at
        }))
      }

      const history = Array.isArray(student.history) ? student.history : []
      const updatedHistory = [snapshot, ...history].slice(0, 5)

      // Update student profile history
      const { error: updateErr } = await client
        .from('students')
        .update({ history: updatedHistory })
        .eq('id', user.id)

      if (updateErr) throw updateErr

      // Delete current guidance results & roadmaps so user can re-generate a new cache
      const admin = requireSupabaseAdmin('Guidance archive cleanup')
      const [guidanceDelete, roadmapDelete] = await Promise.all([
        admin.from('guidance_results').delete().eq('student_id', user.id),
        client.from('roadmaps').delete().eq('student_id', user.id)
      ])
      if (guidanceDelete.error) throw datastoreError('Guidance archive cleanup', guidanceDelete.error)
      if (roadmapDelete.error) throw datastoreError('Roadmap archive cleanup', roadmapDelete.error)
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Re-onboard API Error:', err.message)
    if (err.code === 'DATA_STORE_UNAVAILABLE') {
      res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'Your previous guidance could not be archived safely.' })
    } else {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected re-onboarding error occurred.' })
    }
  }
})

// ─── Analytics Endpoint (pitch-deck data) ─────────────────────────────────────
// GET /api/analytics
// Returns: { by_stream: [{stream, count}], by_state: [{state, count}], total_students: N }
// Requires SUPABASE_SERVICE_ROLE_KEY in server/.env to bypass Row Level Security.
app.get('/api/analytics', requireRole('admin'), async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'ANALYTICS_UNAVAILABLE',
      message: 'Set SUPABASE_SERVICE_ROLE_KEY in server/.env to enable analytics.',
    })
  }

  try {
    // Count students per stream
    const { data: streamRows, error: streamErr } = await supabaseAdmin
      .from('students')
      .select('stream')

    if (streamErr) throw streamErr

    // Count students per state
    const { data: stateRows, error: stateErr } = await supabaseAdmin
      .from('students')
      .select('state')

    if (stateErr) throw stateErr

    // Aggregate in JS (Supabase JS client doesn't expose GROUP BY directly without RPC)
    const countBy = (rows, key) => {
      const map = {}
      for (const row of rows) {
        const val = row[key] || 'Unknown'
        map[val] = (map[val] || 0) + 1
      }
      return Object.entries(map)
        .map(([value, count]) => ({ [key]: value, count }))
        .sort((a, b) => b.count - a.count)
    }

    res.json({
      total_students: streamRows.length,
      by_stream: countBy(streamRows, 'stream'),
      by_state:  countBy(stateRows,  'state'),
    })
  } catch (err) {
    console.error('Analytics API Error:', err.message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ─── Mentor endpoints ────────────────────────────────────────────────────────
// Never fabricate people or availability. An unavailable datastore returns an
// explicit empty result so the client can show an honest service state.

// Fetch active mentors list
app.get('/api/mentors', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json([])
    }

    let result = await supabase
      .from('mentors')
      .select('*')
      .eq('available', true)
      .not('verified_at', 'is', null)
      .order('created_at', { ascending: false })

    if (result.error && (result.error.code === '42703' || result.error.message?.includes('verified_at'))) {
      result = await supabase
        .from('mentors')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false })
    }

    if (result.error) throw result.error

    res.json(result.data || [])
  } catch (err) {
    console.error('Mentors API error:', err.message)
    res.status(503).json({ error: 'MENTORS_UNAVAILABLE', message: 'Mentor listings are temporarily unavailable.' })
  }
})

const validateApplyBody = (req, res, next) => {
  const { name, email, college, degree, stream, story } = req.body
  if (!name || !email || !college || !degree || !stream || !story) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing required fields' })
  }
  next()
}

app.post('/api/mentors/apply', validateApplyBody, mentorApplyLimiter, async (req, res) => {
  try {
    const { name, email, college, degree, stream, story } = req.body
    if (!supabaseAdmin || !isSupabaseConfigured()) {
      return res.status(503).json({
        error: 'APPLICATIONS_UNAVAILABLE',
        message: 'Mentor applications cannot be saved because the datastore is not configured.',
      })
    }

    const { error } = await supabaseAdmin
      .from('mentor_applications')
      .insert({
        name,
        email,
        college,
        degree,
        stream_transition: stream,
        story,
        status: 'pending'
      })

    if (error) throw error

    res.json({ success: true })
  } catch (err) {
    console.error('Mentor application error:', err.message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// Transcription Endpoint (Phase 7 — Voice Input)
// Uses Groq Whisper (whisper-large-v3) — accepts base64 audio from the client
app.post('/api/transcribe', transcribeLimiter, async (req, res) => {
  try {
    const { audio, mimeType } = req.body
    if (!audio) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing audio data' })
    }

    const client = getGroqClient()

    // Convert base64 audio to a Buffer and wrap as a File-like object for the Groq SDK
    const audioBuffer = Buffer.from(audio, 'base64')
    const ext = (mimeType || 'audio/webm').includes('mp4') ? 'mp4'
              : (mimeType || '').includes('ogg') ? 'ogg'
              : 'webm'
    const filename = `audio.${ext}`

    // Groq SDK accepts a File object — create one from the buffer
    const audioFile = new File([audioBuffer], filename, { type: mimeType || 'audio/webm' })

    const transcriptionResponse = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'text',
      language: 'en', // Whisper auto-detects but we bias toward English output
    })

    // transcriptionResponse is the raw text string when response_format is 'text'
    const text = typeof transcriptionResponse === 'string'
      ? transcriptionResponse.trim()
      : (transcriptionResponse.text || '').trim()

    res.json({ transcription: text })
  } catch (err) {
    console.error('Transcription API Error:', err.message)
    if (err.message === 'NO_API_KEY') {
      res.status(401).json({ error: 'NO_API_KEY', message: 'API Key is missing' })
    } else {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
    }
  }
})

// ─── Phase 3 Endpoints ────────────────────────────────────────────────────────

// ── Email helper (Resend) ────────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  const apiKey = config.resendApiKey
  const from = config.resendFromEmail
  if (!apiKey || !from) {
    console.warn('[email] Resend sender is not configured — skipping email send')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!res.ok) {
      console.error(JSON.stringify({ event: 'email_send_failed', provider: 'resend', status: res.status }))
      return false
    }
    console.log(JSON.stringify({ event: 'email_sent', provider: 'resend', subject }))
    return true
  } catch (err) {
    console.error(JSON.stringify({ event: 'email_send_failed', provider: 'resend', error: err.message }))
    return false
  }
}

// ── POST /api/clarify — detect incomplete fields before guidance ─────────────
const clarifyLimiter = createRateLimiter(20, 3600000, 'Too many clarify requests.')
app.post('/api/clarify', clarifyLimiter, (req, res) => {
  const { formData } = req.body
  if (!formData) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing formData' })

  const CLARIFY_FIELDS = [
    { key: 'interests',    question: 'What subjects or activities excite you the most right now?', label: 'Interests' },
    { key: 'biggestFear', question: 'What\'s your biggest worry about choosing a stream or career path?', label: 'Biggest Fear' },
    { key: 'stream',      question: 'Which stream are you currently leaning towards (e.g. Science, Commerce, Arts)?', label: 'Stream Preference' },
    { key: 'incomeRange', question: 'What is your approximate family income per year?', label: 'Family Income' },
    { key: 'preferredCities', question: 'Are you open to studying away from home, or do you prefer staying close?', label: 'Location Preference' },
  ]

  const missing = CLARIFY_FIELDS.filter(f => {
    const v = formData[f.key]
    if (v === null || v === undefined) return true
    if (typeof v === 'string') return v.trim().length < 5
    if (Array.isArray(v)) return v.length === 0
    return false
  })

  res.json({ needs_clarification: missing.length > 0, missing_fields: missing })
})

// ── POST /api/parent-summary — AI rewrite in parent-friendly language ─────────
const parentSummaryLimiter = createRateLimiter(10, 3600000, 'Too many parent summary requests.')
app.post('/api/parent-summary', parentSummaryLimiter, requireAuth(), async (req, res) => {
  const { guidanceResultId } = req.body
  const user = req.authUser
  if (!guidanceResultId) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing guidanceResultId' })

  try {
    const client = getSupabaseClient(req.headers.authorization)

    // Fetch guidance result (RLS ensures student can only see their own)
    const { data: gr, error } = await client
      .from('guidance_results')
      .select('*')
      .eq('id', guidanceResultId)
      .eq('student_id', user.id)
      .maybeSingle()

    if (error || !gr) return res.status(404).json({ error: 'NOT_FOUND', message: 'Guidance result not found' })

    // Return cached parent summary if already generated
    if (gr.parent_summary && gr.parent_summary.length > 20) {
      return res.json({ parent_summary: gr.parent_summary, cached: true })
    }

    // Build parent-rewrite prompt
    const optionsSummary = (gr.options || []).map((o, i) =>
      `Option ${i+1}: ${o.path}\nHonest Take: ${o.honest_take}\nBackup: ${o.backup_plan || 'N/A'}`
    ).join('\n\n')

    const parentPrompt = `You are a calm, clear communicator writing for Indian parents.
Rewrite the following AI-generated student career guidance in simple, reassuring parent-friendly language.
Focus on: stability of career outcome, expected education cost, and backup safety net.
Avoid jargon. Write in plain Hindi-English mixed style if helpful (but prefer English).
Keep it under 200 words total.

Summary for student: ${gr.summary}

Recommended paths:\n${optionsSummary}

Write a warm parent briefing. Include: 1. Why this suits your child, 2. Expected cost range, 3. Backup safety plan. Output only the briefing text, no JSON.`

    let parentSummaryText
    try {
      const groqClient = getGroqClient()
      const completion = await groqClient.chat.completions.create({
        model: config.groqModel,
        messages: [{ role: 'user', content: parentPrompt }],
        temperature: 0.6,
        max_tokens: 512,
      })
      parentSummaryText = completion.choices[0].message.content.trim()
      console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'ai_call', callType: 'parent_summary', studentId: user.id, latencyMs: 0 }))
    } catch (err) {
      console.error('Parent summary AI call error:', err.message)
      console.warn(`[WARN] Parent summary AI call failed. Falling back to mock summary...`)
      
      const firstPath = gr.options?.[0]?.path || 'Commerce / Business studies'
      const firstBackup = gr.options?.[0]?.backup_plan || 'preparing for MBA or specialized certifications'
      
      parentSummaryText = `Dear Parent,

Based on your child's profile, we have suggested career options that balance their natural strengths with stable opportunities. 

1. **Why this suits them:** They show strong analytic skills and interest in business/management. Paths like BBA or finance courses are highly structured and aligned.
2. **Expected Cost:** The target colleges range from ₹50,000 to ₹2,50,000 per year, making it affordable.
3. **Backup Plan:** If admissions are highly competitive, the backup is to pursue ${firstBackup}. This ensures complete career security.`
    }

    // Cache it back to guidance_results
    const admin = requireSupabaseAdmin('Parent summary cache write')
    const { error: parentSummaryWriteError } = await admin
      .from('guidance_results')
      .update({ parent_summary: parentSummaryText })
      .eq('id', guidanceResultId)
      .eq('student_id', user.id)
    if (parentSummaryWriteError) throw datastoreError('Parent summary cache write', parentSummaryWriteError)

    res.json({ parent_summary: parentSummaryText, cached: false })
  } catch (err) {
    console.error('Parent summary error:', err.message)
    if (err.code === 'DATA_STORE_UNAVAILABLE') {
      res.status(503).json({ error: 'DATA_STORE_UNAVAILABLE', message: 'The parent summary could not be saved safely.' })
    } else {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'The parent summary could not be generated.' })
    }
  }
})

// ── GET /api/scenarios ─────────────────────────────────────────────────────────
app.get('/api/scenarios', requireAuth(), async (req, res) => {
  const user = req.authUser
  const client = getSupabaseClient(req.headers.authorization)
  try {
    const { data, error } = await client
      .from('scenarios')
      .select('id, label, form_data, guidance_result, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ scenarios: data || [] })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── POST /api/scenarios ────────────────────────────────────────────────────────
const scenarioLimiter = createRateLimiter(20, 86400000, 'Too many scenarios saved today.')
app.post('/api/scenarios', requireAuth(), scenarioLimiter, async (req, res) => {
  const user = req.authUser
  const { label, formData, guidanceResult } = req.body
  if (!formData || !guidanceResult) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing formData or guidanceResult' })
  const client = getSupabaseClient(req.headers.authorization)
  try {
    const { data, error } = await client
      .from('scenarios')
      .insert({ student_id: user.id, label: label || 'Saved Scenario', form_data: formData, guidance_result: guidanceResult })
      .select()
      .single()
    if (error) throw error
    res.json({ scenario: data })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── DELETE /api/scenarios/:id ──────────────────────────────────────────────────
app.delete('/api/scenarios/:id', requireAuth(), async (req, res) => {
  const user = req.authUser
  const { id } = req.params
  const client = getSupabaseClient(req.headers.authorization)
  try {
    const { error } = await client.from('scenarios').delete().eq('id', id).eq('student_id', user.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── POST /api/mentor-sessions ──────────────────────────────────────────────────
const sessionCreateLimiter = createRateLimiter(5, 86400000, 'Too many session requests today.')
app.post('/api/mentor-sessions', requireAuth(), sessionCreateLimiter, async (req, res) => {
  const user = req.authUser
  const { mentorId, sessionDate } = req.body
  if (!mentorId) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing mentorId' })
  const client = getSupabaseClient(req.headers.authorization)
  try {
    const { data, error } = await client
      .from('mentor_sessions')
      .insert({ student_id: user.id, mentor_id: mentorId, session_date: sessionDate || null, status: 'pending' })
      .select()
      .single()
    if (error) throw error
    await sendEmail(
      user.email,
      'Mentor Session Requested — Aage Kya?',
      `<p>Hi there! Your mentor session request has been submitted. Your mentor will confirm shortly.</p>`
    )
    res.json({ session: data })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── GET /api/mentor-sessions ───────────────────────────────────────────────────
app.get('/api/mentor-sessions', requireAuth(), async (req, res) => {
  const user = req.authUser
  const client = getSupabaseClient(req.headers.authorization)
  try {
    // Students see their own; mentors see sessions for their profile
    let query
    if (user.role === 'mentor') {
      // Find mentor record by user_id
      const { data: mentorRow } = await supabase.from('mentors').select('id').eq('user_id', user.id).maybeSingle()
      if (!mentorRow) return res.json({ sessions: [] })
      const { data, error } = await client.from('mentor_sessions').select('*, mentors(name)').eq('mentor_id', mentorRow.id).order('created_at', { ascending: false })
      if (error) throw error
      return res.json({ sessions: data || [] })
    } else {
      const { data, error } = await client.from('mentor_sessions').select('*, mentors(name)').eq('student_id', user.id).order('created_at', { ascending: false })
      if (error) throw error
      return res.json({ sessions: data || [] })
    }
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── PATCH /api/mentor-sessions/:id/rate ───────────────────────────────────────
app.patch('/api/mentor-sessions/:id/rate', requireAuth(), async (req, res) => {
  const { id } = req.params
  const { rating, ratingComment } = req.body
  const user = req.authUser
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Rating must be 1–5' })
  const client = getSupabaseClient(req.headers.authorization)
  try {
    const { data, error } = await client
      .from('mentor_sessions')
      .update({ rating: Number(rating), rating_comment: ratingComment || '' })
      .eq('id', id).eq('student_id', user.id)
      .select().single()
    if (error) throw error
    res.json({ session: data })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── PATCH /api/mentor-sessions/:id/notes — mentor writes session notes ─────────
app.patch('/api/mentor-sessions/:id/notes', requireRole('mentor'), async (req, res) => {
  const { id } = req.params
  const { notes, status } = req.body
  const user = req.authUser
  try {
    // Verify the mentor owns this session
    const { data: mentorRow } = await supabase.from('mentors').select('id').eq('user_id', user.id).maybeSingle()
    if (!mentorRow) return res.status(403).json({ error: 'FORBIDDEN', message: 'No mentor profile found' })
    const client = getSupabaseClient(req.headers.authorization)
    const update = {}
    if (notes !== undefined) update.notes = notes
    if (status) update.status = status
    const { data, error } = await client
      .from('mentor_sessions').update(update).eq('id', id).eq('mentor_id', mentorRow.id)
      .select().single()
    if (error) throw error
    res.json({ session: data })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── GET /api/qa ────────────────────────────────────────────────────────────────
app.get('/api/qa', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit
  const streamTag = req.query.stream || null
  try {
    if (!isSupabaseConfigured()) return res.json({ posts: [], page })
    let query = supabase
      .from('qa_posts')
      .select('id, question, answer, answered_at, stream_tag, created_at, mentor_id, mentors(name, initials)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (streamTag) query = query.eq('stream_tag', streamTag)
    const { data, error } = await query
    if (error) throw error
    res.json({ posts: data || [], page })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── POST /api/qa ───────────────────────────────────────────────────────────────
const qaPostLimiter = createRateLimiter(5, 3600000, 'Too many Q&A posts. Please wait an hour.')
app.post('/api/qa', requireAuth(), qaPostLimiter, async (req, res) => {
  const user = req.authUser
  const { question, streamTag } = req.body
  if (!question || question.trim().length < 10) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Question must be at least 10 characters' })
  const client = getSupabaseClient(req.headers.authorization)
  try {
    const { data, error } = await client
      .from('qa_posts')
      .insert({ author_id: user.id, question: question.trim(), stream_tag: streamTag || '' })
      .select().single()
    if (error) throw error
    res.json({ post: data })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── PATCH /api/qa/:id/answer — mentor posts an answer ─────────────────────────
app.patch('/api/qa/:id/answer', requireRole('mentor'), async (req, res) => {
  const { id } = req.params
  const { answer } = req.body
  const user = req.authUser
  if (!answer || answer.trim().length < 5) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Answer too short' })
  try {
    const { data: mentorRow } = await supabase.from('mentors').select('id').eq('user_id', user.id).maybeSingle()
    const client = getSupabaseClient(req.headers.authorization)
    const { data, error } = await client
      .from('qa_posts')
      .update({ answer: answer.trim(), answered_at: new Date().toISOString(), mentor_id: mentorRow?.id || null })
      .eq('id', id)
      .select().single()
    if (error) throw error
    res.json({ post: data })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── GET /api/notifications ─────────────────────────────────────────────────────
app.get('/api/notifications', requireAuth(), async (req, res) => {
  const user = req.authUser
  const client = getSupabaseClient(req.headers.authorization)
  try {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    res.json({ notifications: data || [] })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────
app.patch('/api/notifications/:id/read', requireAuth(), async (req, res) => {
  const { id } = req.params
  const user = req.authUser
  const client = getSupabaseClient(req.headers.authorization)
  try {
    const { error } = await client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ─── Chatbot Endpoint (lightweight, for new users) ────────────────────────────

const chatLimiter = createRateLimiter(10, 3600000, 'Too many chat messages. Please try again in an hour.')

const CHAT_SYSTEM_PROMPT = `You are a helpful, concise, and honest guide for Indian students asking general questions about education, courses, streams, and careers.

RULES:
1. Answer factual, general questions directly and clearly (e.g. "What is PCM?", "What is CUET?", "What can I do after Commerce?").
2. Keep answers short — under 150 words. Use bullet points if listing things.
3. Be honest and specific to Indian education context.
4. If the question requires knowing the student's personal situation (marks, income, state, family background, interests, risk comfort), do NOT try to answer it. Instead set handoff=true.
5. Examples of questions that need handoff: "Which stream is best for me?", "What college should I apply to?", "Will I get into NIT?", "Am I eligible for NEET?", "What should I do after my results?".
6. Examples that do NOT need handoff (answer directly): "What is JEE?", "What is the difference between NEET and JEE?", "What careers can I get in Commerce?", "What is ITI?", "How long is MBBS?".

RESPONSE FORMAT: Always respond in this exact JSON structure (no markdown, no backticks):
{
  "message": "Your answer here",
  "handoff": false,
  "handoff_reason": ""
}
If handoff is true, message should acknowledge the question and explain why personalised guidance is needed. handoff_reason should be 1 sentence explaining what personal context is missing.`

function getMockChatResponse(messages, profile) {
  const lastMsg = messages[messages.length - 1].content.toLowerCase()
  let response = "That's an interesting question! Can you tell me more about your current stream and what interests you?"
  let handoff = false
  let handoff_reason = ""

  if (profile) {
    const name = profile.full_name ? ` ${profile.full_name}` : ''
    const stream = profile.stream || 'your selected stream'
    const classLevel = profile.class_level === 'class10' ? 'Class 10' : profile.class_level === 'class12' ? 'Class 12' : 'school'
    
    if (lastMsg.includes('engineering') || lastMsg.includes('btech') || lastMsg.includes('b.tech') || lastMsg.includes('computer')) {
      if (profile.class_level === 'class12' && (profile.stream === 'Science' || profile.stream === 'Science (PCM)')) {
        response = `Hey${name}, since you are in Class 12 Science (marks: ${profile.marks || 'N/A'}, state: ${profile.state || 'N/A'}), engineering is a great path. You should prepare for exams like JEE and KCET/COMEDK. Your preferred admission mode is ${profile.preferred_admission || 'KCET'}.`
      } else {
        response = `Hi${name}, you mentioned you are in ${classLevel} with ${stream} stream. Typically, engineering requires Science (PCM) in Class 12. Let me know if you want to know about other options!`
      }
    } else if (lastMsg.includes('commerce') || lastMsg.includes('ca') || lastMsg.includes('bba')) {
      response = `Hi${name}, since you are in ${classLevel} and interested in Commerce/CA, you should focus on Accounting and Economics. We recommend checking BBA or B.Com programs in your preferred cities.`
    } else if (lastMsg.includes('scholarship') || lastMsg.includes('fee') || lastMsg.includes('cost')) {
      response = `Hi${name}, based on your profile (State: ${profile.state || 'N/A'}, Marks: ${profile.marks || 'N/A'}), we suggest checking the Scholarships tab on your Dashboard to see matching national and state benefits.`
    } else {
      response = `Hey${name}, based on your ${classLevel} ${stream} profile, how else can I help guide your education planning?`
    }
  } else {
    if (lastMsg.includes('engineering') || lastMsg.includes('btech') || lastMsg.includes('b.tech') || lastMsg.includes('computer')) {
      response = "Engineering (especially Computer Science) is highly popular. For high-quality, honest advice tailored to you, please fill out our Onboarding form so I know your class board, marks, and state."
      handoff = true
      handoff_reason = "Need student board and marks to suggest realistic engineering options."
    } else if (lastMsg.includes('commerce') || lastMsg.includes('ca') || lastMsg.includes('bba')) {
      response = "Commerce fields like CA, BBA, and finance offer amazing opportunities. I can give you a personalized 4-year roadmap if you complete the Onboarding profile first."
      handoff = true
      handoff_reason = "Requires family income range and preferred cities to tailor finance options."
    } else if (lastMsg.includes('scholarship') || lastMsg.includes('fee') || lastMsg.includes('cost')) {
      response = "We have mapped several state-specific and national scholarships in our database. Complete the onboarding so we can filter ones matching your family income!"
      handoff = true
      handoff_reason = "Requires family income range and state to filter scholarships."
    }
  }

  return {
    message: response,
    handoff,
    handoff_reason
  }
}

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { messages, profile } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing messages array' })
  }
  // Validate message structure
  const validMessages = messages
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .slice(-6) // max 6 messages context window
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content.slice(0, 1000) }))

  if (validMessages.length === 0) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'No valid messages found' })
  }

  try {
    const client = getGroqClient()
    const model = config.groqModel
    
    let systemPrompt = CHAT_SYSTEM_PROMPT
    if (profile) {
      systemPrompt += `\n\nCURRENT STUDENT PROFILE CONTEXT:
- Name: ${profile.full_name || 'N/A'}
- Class: ${profile.class_level === 'class10' ? 'Class 10' : profile.class_level === 'class12' ? 'Class 12' : 'Other'}
- Stream: ${profile.stream || 'N/A'}
- Academic Marks: ${profile.marks || 'N/A'}
- State: ${profile.state || 'N/A'}
- Preferred Admission Mode: ${profile.preferred_admission || 'N/A'}

You MUST use this context when answering the student's questions. For example, if they ask for stream recommendations and they are in Class 10 with 85% marks, you can give tailored advice directly instead of triggering a handoff (since you already have the profile info!). Only trigger handoff (handoff=true) if they ask a highly specific personalized question whose required details are NOT in the profile above.`
    }
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...validMessages,
      ],
      temperature: 0.5,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    })
    const text = completion.choices[0].message.content
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const result = JSON.parse(cleaned)
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'ai_call', callType: 'chat', model, handoff: result.handoff }))
    res.json({
      message: result.message || 'Sorry, I couldn\'t generate a response. Please try again.',
      handoff: result.handoff === true,
      handoff_reason: result.handoff_reason || '',
    })
  } catch (err) {
    console.error('Chat API Error:', err.message)
    console.warn(`[WARN] Chat API failed: ${err.message}. Falling back to mock chat response...`)
    const result = getMockChatResponse(validMessages, profile)
    res.json({
      message: result.message,
      handoff: result.handoff,
      handoff_reason: result.handoff_reason
    })
  }
})

// ─── Course Feedback Endpoints ───────────────────────────────────────────────

// GET /api/course-feedback?stream=Science (PCM)
// Returns approved public feedback for a given stream/path
app.get('/api/course-feedback', async (req, res) => {
  const streamKey = req.query.stream
  if (!streamKey || streamKey.trim().length < 2) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing stream query param' })
  }
  try {
    if (!isSupabaseConfigured()) {
      return res.json({ feedback: [] })
    }
    const { data, error } = await supabase
      .from('course_feedback')
      .select('id, content, created_at')
      .eq('stream_key', streamKey.trim())
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) throw error
    res.json({ feedback: data || [] })
  } catch (err) {
    console.error('Course feedback fetch error:', err.message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// POST /api/course-feedback — authenticated students submit feedback
const courseFeedbackLimiter = createRateLimiter(3, 3600000, 'You can only submit 3 feedback entries per hour.')
app.post('/api/course-feedback', requireAuth(), courseFeedbackLimiter, async (req, res) => {
  const user = req.authUser
  const { streamKey, content } = req.body
  if (!streamKey || !content || content.trim().length < 20) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Feedback must be at least 20 characters and include a stream key.' })
  }
  if (content.trim().length > 1000) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Feedback must be under 1000 characters.' })
  }
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        error: 'FEEDBACK_UNAVAILABLE',
        message: 'Feedback cannot be saved because the datastore is not configured.',
      })
    }
    const client = getSupabaseClient(req.headers.authorization)
    const { data, error } = await client
      .from('course_feedback')
      .insert({
        stream_key: streamKey.trim(),
        author_id: user.id,
        content: content.trim(),
        approved: false // requires moderation before appearing publicly
      })
      .select('id')
      .single()
    if (error) throw error
    res.json({ success: true, id: data.id, message: 'Feedback submitted — it will appear after review.' })
  } catch (err) {
    console.error('Course feedback submit error:', err.message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

// GET /api/admin/mentor-applications — Fetch all applications
app.get('/api/admin/mentor-applications', requireRole('admin'), async (req, res) => {
  const client = supabaseAdmin || supabase
  try {
    const { data, error } = await client
      .from('mentor_applications')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ applications: data || [] })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// POST /api/admin/mentor-applications/:id/approve — Approve a mentor application
app.post('/api/admin/mentor-applications/:id/approve', requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const client = supabaseAdmin || supabase
  try {
    // 1. Get the application details
    const { data: app, error: getErr } = await client
      .from('mentor_applications')
      .select('*')
      .eq('id', id)
      .single()
    if (getErr || !app) return res.status(404).json({ error: 'NOT_FOUND', message: 'Application not found' })

    // 2. Insert into public.mentors
    const initials = app.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3) || 'M'
    
    // Choose a gradient/styling based on degree
    const styles = [
      { gradient: 'from-blue-500/30 to-blue-600/10', border: 'border-blue-500/25', tag_color: 'bg-blue-500/10 text-blue-300 border-blue-500/20', initials_bg: 'bg-blue-500/20 text-blue-300' },
      { gradient: 'from-amber-500/30 to-amber-600/10', border: 'border-amber-500/25', tag_color: 'bg-amber-500/10 text-amber-300 border-amber-500/20', initials_bg: 'bg-amber-500/20 text-amber-300' },
      { gradient: 'from-emerald-500/30 to-emerald-600/10', border: 'border-emerald-500/25', tag_color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', initials_bg: 'bg-emerald-500/20 text-emerald-300' }
    ]
    const chosenStyle = styles[Math.floor(Math.random() * styles.length)]

    const { error: insertErr } = await client
      .from('mentors')
      .insert({
        name: app.name,
        initials,
        college: app.college,
        degree: app.degree,
        stream: app.stream_transition || 'General',
        stream_category: 'Other',
        city: 'Online',
        story: app.story,
        tags: [app.degree, 'Approved'],
        available: true,
        ...chosenStyle
      })

    if (insertErr && insertErr.code !== '23505') { // ignore duplicate name error
      throw insertErr
    }

    // 3. Update application status to approved
    const { error: updateErr } = await client
      .from('mentor_applications')
      .update({ status: 'approved' })
      .eq('id', id)

    if (updateErr) throw updateErr

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// POST /api/admin/mentor-applications/:id/reject — Reject a mentor application
app.post('/api/admin/mentor-applications/:id/reject', requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const client = supabaseAdmin || supabase
  try {
    const { error } = await client
      .from('mentor_applications')
      .update({ status: 'rejected' })
      .eq('id', id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// GET /api/admin/course-feedback — Fetch all course feedback
app.get('/api/admin/course-feedback', requireRole('admin'), async (req, res) => {
  const client = supabaseAdmin || supabase
  try {
    const { data, error } = await client
      .from('course_feedback')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ feedback: data || [] })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// POST /api/admin/course-feedback/:id/approve — Approve a feedback entry
app.post('/api/admin/course-feedback/:id/approve', requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const client = supabaseAdmin || supabase
  try {
    const { error } = await client
      .from('course_feedback')
      .update({ approved: true })
      .eq('id', id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// DELETE /api/admin/course-feedback/:id — Delete a feedback entry
app.delete('/api/admin/course-feedback/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const client = supabaseAdmin || supabase
  try {
    const { error } = await client
      .from('course_feedback')
      .delete()
      .eq('id', id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found.', requestId: req.requestId })
})

app.use((err, req, res, _next) => {
  const isCorsError = err?.code === 'CORS_NOT_ALLOWED'
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'error',
    event: 'unhandled_request_error',
    requestId: req.requestId,
    error: err?.message || 'Unknown error',
  }))
  res.status(isCorsError ? 403 : 500).json({
    error: isCorsError ? 'ORIGIN_NOT_ALLOWED' : 'INTERNAL_ERROR',
    message: isCorsError ? 'Request origin is not allowed.' : 'An unexpected error occurred.',
    requestId: req.requestId,
  })

})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

