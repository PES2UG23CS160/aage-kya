import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ override: true })

const app = express()
app.set('trust proxy', 1) // Trust first proxy (Railway, Render, Vercel)

// CORS — allow origins from ALLOWED_ORIGINS env var (comma-separated)
// Falls back to all origins in development
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null

app.use(cors({
  origin: allowedOrigins
    ? (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
        cb(new Error(`CORS: origin ${origin} not allowed`))
      }
    : true,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Structured Logger Middleware
app.use((req, res, next) => {
  const start = Date.now()
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const authHeader = req.headers.authorization ? 'Yes' : 'No'
    console.log(`[${new Date().toISOString()}] INFO: ${req.method} ${req.originalUrl} from ${ip} - ${res.statusCode} (Latency: ${duration}ms) [Auth: ${authHeader}]`)
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

const isDev = process.env.NODE_ENV !== 'production'
const guidanceLimiter = createRateLimiter(isDev ? 50 : 5, 86400000, "You can only generate 5 career guidance reports per day to prevent system abuse. Please try again tomorrow.")
const roadmapLimiter  = createRateLimiter(isDev ? 50 : 5, 86400000, "You can only generate 5 career roadmaps per day to prevent system abuse. Please try again tomorrow.")
const mentorApplyLimiter = createRateLimiter(1, 3600000, "You can only submit one application per hour. Please try again later.")
const transcribeLimiter  = createRateLimiter(15, 3600000, "You have exceeded the transcription rate limit. Please try again in an hour.")



const PORT = process.env.PORT || 5000

// Initialize Supabase Client (anon key — for auth token validation)
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin Supabase client (service role key — bypasses RLS for aggregate queries)
// SUPABASE_SERVICE_ROLE_KEY is optional; analytics endpoint will be disabled without it.
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null

// Initialize Groq client
const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('NO_API_KEY')
  }
  return new Groq({ apiKey })
}

// User-scoped Supabase client helper to respect Row Level Security (RLS)
function getSupabaseClient(authHeader) {
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

// Retrieve authenticated user from Supabase token; also fetches role from students table
async function getAuthUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    // Attach role from students profile (defaults 'student' if row doesn't exist yet)
    try {
      const { data: profile } = await supabase
        .from('students')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      user.role = profile?.role || 'student'
    } catch (_) {
      user.role = 'student'
    }
    return user
  } catch (err) {
    return null
  }
}

// Middleware: require a specific role (or any of a list of roles)
function requireRole(...roles) {
  return async (req, res, next) => {
    const user = await getAuthUser(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: `Requires role: ${roles.join(' or ')}` })
    }
    req.authUser = user
    next()
  }
}

// Middleware: require any authenticated user (student, mentor, parent)
function requireAuth() {
  return async (req, res, next) => {
    const user = await getAuthUser(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    req.authUser = user
    next()
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
  return supabaseUrl && 
         !supabaseUrl.includes('your-supabase') && 
         !supabaseUrl.includes('your-project-ref') && 
         supabaseUrl !== 'https://your-project-ref.supabase.co'
}

// Fetch real colleges for this student from the DB
async function fetchCollegesForStudent(form) {
  if (!isSupabaseConfigured()) return []
  const marks  = Number(form.marks) || 0
  const stream = form.stream || ''
  const state  = form.state  || ''

  try {
    // Fetch all colleges matching this stream (GIN index makes this fast)
    const { data, error } = await supabase
      .from('colleges')
      .select('name, state, city, yearly_cost_min, yearly_cost_max, college_type, national, source_url, min_marks, max_marks')
      .contains('streams', [stream])

    if (error) { console.warn('College fetch warning:', error.message); return [] }

    // Filter in JS: marks range ±10, and state match OR national institution
    return (data || [])
      .filter(c =>
        c.min_marks <= marks + 10 &&
        c.max_marks >= marks - 8  &&
        (c.national || c.state === state)
      )
      .sort((a, b) => b.min_marks - a.min_marks)
      .slice(0, 15)
  } catch (err) {
    console.warn('College fetch failed:', err.message)
    return []
  }
}

// Fetch relevant scholarships for this student from the DB
async function fetchScholarshipsForStudent(form) {
  if (!isSupabaseConfigured()) return []
  const marks       = Number(form.marks) || 0
  const incomeLakh  = INCOME_TO_LAKH[form.incomeRange] || 99
  const stream      = form.stream || ''
  const state       = form.state  || ''

  try {
    const { data, error } = await supabase
      .from('scholarships')
      .select('name, description, application_url, deadline_pattern, eligibility_income_max_lakh, eligible_streams, eligible_states')

    if (error) { console.warn('Scholarship fetch warning:', error.message); return [] }

    return (data || []).filter(s => {
      const streams = s.eligible_streams || []
      const states  = s.eligible_states  || []
      const streamOk = streams.includes('All') || streams.length === 0 || streams.includes(stream)
      const stateOk  = states.includes('All')  || states.length === 0  || states.includes(state)
      const marksOk  = (s.eligibility_marks_min || 0) <= marks
      const incomeOk = (s.eligibility_income_max_lakh || 99) >= incomeLakh
      return streamOk && stateOk && marksOk && incomeOk
    }).slice(0, 8)
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

// Find the scholarship object whose name best matches what Gemini chose
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
  return bestScore > 0 ? best : scholarships[0] // fallback to first if no match
}

// Onboarding Prompt Builder (now accepts real DB data for RAG grounding)
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
    
    return `You are an honest, caring guide for Indian students after 10th grade. Give REAL, specific advice. Not generic. Not motivational fluff.

Student Profile (Class 10 Student):
- Board: ${form.board || 'Not specified'}
- Marks (9th/10th Pre-boards): ${form.marks || 'Not specified'}%
- State: ${form.state || 'Not specified'}
- Family Income: ${income}
- First Generation College Student: ${firstGen}
- Location Constraints/Preferences: ${cities}
- Subject Interests / Leaning: ${form.interests || 'Not specified'} (Stream leaning: ${form.stream || 'Undecided'})
- Parent Pressure/Expectations: ${parentPressureText}
- Risk Comfort (Safe vs Exploratory): ${form.riskComfort || 'Not specified'}
- Coaching Access Nearby: ${coachingAccessText}
- Biggest Fear about Stream Selection: ${form.biggestFear || 'Not specified'}

Recommend 3-4 specific high school stream / education tracks (such as Science (PCM), Science (PCB), Commerce, Arts / Humanities, or specific Diploma/Vocational tracks) that fit this student's profile.

Respond ONLY in this exact JSON structure (no markdown, no backticks, just raw JSON):
{
  "summary": "A warm, honest 2-3 sentence summary of this student's current situation and core choices. Be specific to their marks, interests, and parental expectations.",
  "options": [
    {
      "path": "Stream option name (e.g. Science (PCM) with Tech Focus)",
      "honest_take": "2-3 sentences of brutally honest, specific advice for THIS Class 10 student. Explain why this fits their interests/risk/marks, and the difficulty level.",
      "requires_entrance_exam": "Entrance exams they will face post-12th if they choose this stream (e.g. JEE Main, NEET-UG, CLAT, NATA, or None) — be specific",
      "realistic_colleges": ["3-4 target high education institutions or specific stream pathways they should aim for in future"],
      "avg_yearly_cost": "Realistic total yearly cost range for school + coaching/tuition in INR/year",
      "opens_doors_to": ["3-4 specific future degrees or career roles this stream leads to"],
      "watch_out_for": "One specific, honest warning/pitfall about this stream path",
      "backup_plan": "A practical backup plan if they find the stream too difficult in Class 11/12 or change their mind (e.g. shifting to BCA, switching to Commerce stream, etc.)"
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

  const collegesSection = colleges.length > 0
    ? `\nVERIFIED COLLEGE LIST for this student (stream: ${form.stream}, state: ${form.state}, marks: ${form.marks}%):\n${formatCollegesForPrompt(colleges)}\n`
    : ''

  const scholarshipsSection = scholarships.length > 0
    ? `\nVERIFIED SCHOLARSHIPS this student qualifies for:\n${formatScholarshipsForPrompt(scholarships)}\n`
    : ''

  const groundingInstruction = grounded
    ? `\nCRITICAL INSTRUCTIONS:\n- For "realistic_colleges": ONLY recommend college names from the VERIFIED COLLEGE LIST above. Do NOT invent college names not in that list. Pick the most relevant ones for each career option.\n- For "scholarship_to_check": use the name of ONE scholarship from the VERIFIED SCHOLARSHIPS list above, the one most relevant to this student.\n- For "avg_yearly_cost": use the cost ranges from the verified college list, don't invent figures.\n`
    : ''

  return `You are an honest, caring guide for Indian students after 12th grade. Give REAL, specific advice. Not generic. Not motivational fluff.

Student Profile:
- Board: ${form.board || 'Not specified'}
- Stream: ${form.stream || 'Not specified'}
- Marks: ${form.marks || 'Not specified'}%
- State: ${form.state || 'Not specified'}
- Family Income: ${income}
- First Generation College Student: ${firstGen}
- Preferred Study Location: ${cities}
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
      "realistic_colleges": ["3-4 real colleges realistic for this option and the student's marks and state. Use verified list if provided."],
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
- State: ${form.state || 'Not specified'}
- Family Income: ${income}
- First Generation College Student: ${firstGen}
- Preferred Location/Constraint: ${cities}
- Interests: ${form.interests || 'Not specified'}
- Biggest Fear: ${form.biggestFear || 'Not specified'}
${classLevel === 'class10' ? `- Leaning Stream: ${form.stream || 'Undecided'}` : `- Career Path Leaning: ${option.path}`}

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

// Helper to call Groq and parse JSON output (with structured latency logging)
async function callGemini(prompt, { studentId = null, callType = 'guidance' } = {}) {
  const client = getGroqClient()
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const promptTokenEstimate = Math.ceil(prompt.length / 4)
  const start = Date.now()
  let parseOk = false
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    })
    const text = completion.choices[0].message.content
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const result = JSON.parse(cleaned)
    parseOk = true
    const latencyMs = Date.now() - start
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'ai_call', callType, model, promptTokens: promptTokenEstimate, latencyMs, parseOk, studentId }))
    return result
  } catch (err) {
    const latencyMs = Date.now() - start
    console.error(JSON.stringify({ ts: new Date().toISOString(), event: 'ai_call_error', callType, model, promptTokens: promptTokenEstimate, latencyMs, parseOk, studentId, error: err.message }))
    throw err
  }
}

// --- Endpoints ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const validateGuidanceBody = (req, res, next) => {
  if (!req.body.formData) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing formData' })
  }
  next()
}

// Guidance Results Endpoint (Phase 3: RAG-grounded)
app.post('/api/guidance', validateGuidanceBody, guidanceLimiter, async (req, res) => {
  try {
    const { formData } = req.body


    const authHeader = req.headers.authorization
    const user = await getAuthUser(authHeader)

    if (user) {
      const client = getSupabaseClient(authHeader)
      // Check if guidance results are already cached in DB
      const { data: cached } = await client
        .from('guidance_results')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

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
          grounded: false, // cached results predate the RAG enrichment
          scholarships_list
        })
      }
    }

    // ── Phase 3: Fetch real data in parallel before calling Gemini ──────────
    const [colleges, scholarships] = await Promise.all([
      fetchCollegesForStudent(formData),
      fetchScholarshipsForStudent(formData),
    ])
    const grounded = colleges.length > 0 || scholarships.length > 0
    if (grounded) {
      console.log(`RAG: found ${colleges.length} colleges, ${scholarships.length} scholarships for ${formData.stream}/${formData.state}`)
    } else {
      console.log('RAG: no DB data found, falling back to Gemini-only prompt')
    }

    // Build RAG-grounded prompt and call Gemini
    const prompt = buildPrompt(formData, colleges, scholarships)
    const confidence = computeConfidence(formData)
    const result = await callGemini(prompt, { studentId: user?.id || null, callType: 'guidance' })

    // Build helper maps so the frontend can render source links without
    // relying on Gemini to hallucinate URLs.
    const colleges_data = buildCollegesDataMap(colleges)
    const matchedScholarship = matchScholarship(scholarships, result.scholarship_to_check)
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
      await client.from('students').upsert({
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

      // Save results
      await client.from('guidance_results').insert({
        student_id: user.id,
        summary: result.summary,
        options: result.options,
        scholarship_to_check: result.scholarship_to_check,
        one_thing_to_do_this_week: result.one_thing_to_do_this_week,
        confidence_score: confidence.confidence_score,
        confidence_label: confidence.confidence_label,
        confidence_reason: confidence.confidence_reason,
        scholarships_list: (scholarships || []).map(s => ({ name: s.name, application_url: s.application_url, deadline_pattern: s.deadline_pattern, description: s.description }))
      })
      // Send guidance-ready email notification (fire-and-forget)
      sendEmail(
        user.email,
        'Your Career Guidance Is Ready — Aage Kya?',
        `<p>Hi! Your personalised career guidance report has been generated. <a href="https://aagekya.in/result">View it here.</a></p>`
      )
    }

    const scholarships_list = (scholarships || []).map(s => ({
      name: s.name,
      application_url: s.application_url,
      deadline_pattern: s.deadline_pattern,
      description: s.description,
    }))

    res.json({
      ...result,
      grounded,
      colleges_data,
      scholarship_data,
      scholarships_list,
      ...confidence,
    })
  } catch (err) {
    console.error('Guidance API Error:', err.message)
    if (err.message === 'NO_API_KEY') {
      res.status(401).json({ error: 'NO_API_KEY', message: 'API Key is missing' })
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


    const authHeader = req.headers.authorization
    const user = await getAuthUser(authHeader)

    if (user) {
      const client = getSupabaseClient(authHeader)
      // Check cache in DB
      const { data: cached } = await client
        .from('roadmaps')
        .select('*')
        .eq('student_id', user.id)
        .eq('career_path', option.path)
        .maybeSingle()

      if (cached) {
        return res.json({
          career_path: cached.career_path,
          overview: cached.overview,
          years: cached.years,
          cached: true
        })
      }
    }

    // Call Gemini if not cached
    const prompt = buildRoadmapPrompt(formData, option)
    const result = await callGemini(prompt)

    // Save to DB if authenticated
    if (user) {
      const client = getSupabaseClient(authHeader)
      await client.from('roadmaps').insert({
        student_id: user.id,
        career_path: option.path,
        overview: result.overview,
        years: result.years
      })
    }

    res.json(result)
  } catch (err) {
    console.error('Roadmap API Error:', err.message)
    if (err.message === 'NO_API_KEY') {
      res.status(401).json({ error: 'NO_API_KEY', message: 'API Key is missing' })
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

    // Upsert Student Profile
    await client.from('students').upsert({
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

    // Upsert Guidance Results
    const { data: existing } = await client
      .from('guidance_results')
      .select('id')
      .eq('student_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      await client.from('guidance_results').insert({
        student_id: user.id,
        summary: result.summary,
        options: result.options,
        scholarship_to_check: result.scholarship_to_check,
        one_thing_to_do_this_week: result.one_thing_to_do_this_week
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Sync API Error:', err.message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
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
      await Promise.all([
        client.from('guidance_results').delete().eq('student_id', user.id),
        client.from('roadmaps').delete().eq('student_id', user.id)
      ])
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Re-onboard API Error:', err.message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
  }
})

// ─── Analytics Endpoint (pitch-deck data) ─────────────────────────────────────
// GET /api/analytics
// Returns: { by_stream: [{stream, count}], by_state: [{state, count}], total_students: N }
// Requires SUPABASE_SERVICE_ROLE_KEY in server/.env to bypass Row Level Security.
app.get('/api/analytics', async (req, res) => {
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

// ─── Mentors Endpoints (Phase 4 — Real Mentor Connect) ──────────────────────────


const HARDCODED_MENTORS = [
  {
    id: 'fallback-1',
    name: 'Rahul S.',
    initials: 'RS',
    college: 'PES University',
    degree: 'B.E. Electronics & Communication',
    stream: 'PCB → ECE',
    stream_category: 'Science (PCB)',
    city: 'Bengaluru',
    cal_link: 'https://calendly.com/rahul-s-mentor/20min',
    story: "I missed NEET by 8 marks. Ended up in ECE. Here's what I wish someone told me.",
    tags: ['NEET dropout', 'Bio to Engineering', 'Career pivot'],
    gradient: 'from-blue-500/30 to-blue-600/10',
    border: 'border-blue-500/25',
    tag_color: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    initials_bg: 'bg-blue-500/20 text-blue-300',
    available: true,
  },
  {
    id: 'fallback-2',
    name: 'Priya M.',
    initials: 'PM',
    college: 'NIT Surathkal',
    degree: 'B.Tech Computer Science',
    stream: 'PCM → CSE',
    stream_category: 'Science (PCM)',
    city: 'Mangaluru',
    cal_link: 'https://calendly.com/priya-m-mentor/20min',
    story: "First in my family to leave home for college. It was terrifying. I'll tell you exactly what helped.",
    tags: ['First-gen student', 'Hostel life', 'Scholarships'],
    gradient: 'from-purple-500/30 to-purple-600/10',
    border: 'border-purple-500/25',
    tag_color: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    initials_bg: 'bg-purple-500/20 text-purple-300',
    available: true,
  },
  {
    id: 'fallback-3',
    name: 'Arjun K.',
    initials: 'AK',
    college: 'Manipal University',
    degree: 'BBA + Certification Finance',
    stream: 'Commerce',
    stream_category: 'Commerce',
    city: 'Pune',
    cal_link: 'https://calendly.com/arjun-k-mentor/20min',
    story: "Family wanted CA. I wanted something else. Here's how I navigated that conversation.",
    tags: ['Family pressure', 'Commerce', 'Non-CA path'],
    gradient: 'from-emerald-500/30 to-emerald-600/10',
    border: 'border-emerald-500/25',
    tag_color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    initials_bg: 'bg-emerald-500/20 text-emerald-300',
    available: true,
  },
  {
    id: 'fallback-4',
    name: 'Anjali D.',
    initials: 'AD',
    college: 'Delhi University',
    degree: 'B.A. Psychology',
    stream: 'Class 10 → Humanities',
    stream_category: 'Class 10 / Stream Selection',
    city: 'Delhi',
    cal_link: 'https://calendly.com/anjali-d-mentor/20min',
    story: "I spent months stressing over whether to take PCM or Arts. I chose Arts and it was the best decision of my life. Let's figure out what fits you.",
    tags: ['Stream selection', 'Humanities', 'Parent pressure'],
    gradient: 'from-amber-500/30 to-amber-600/10',
    border: 'border-amber-500/25',
    tag_color: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    initials_bg: 'bg-amber-500/20 text-amber-300',
    available: true,
  },
]

// Fetch active mentors list
app.get('/api/mentors', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json(HARDCODED_MENTORS)
    }

    const { data, error } = await supabase
      .from('mentors')
      .select('*')
      .eq('available', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      return res.json(HARDCODED_MENTORS)
    }

    res.json(data)
  } catch (err) {
    console.warn('Mentors API error, returning fallback:', err.message)
    res.json(HARDCODED_MENTORS)
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
      console.warn(`Volunteer signup simulated for ${name} (${email}) - Supabase not fully configured`)
      return res.json({ success: true, simulated: true })
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
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: 'Aage Kya? <noreply@aagekya.in>', to, subject, html }),
    })
    const data = await res.json()
    if (!res.ok) console.error('[email] Resend error:', data)
    else console.log(`[email] Sent "${subject}" to ${to}`)
  } catch (err) {
    console.error('[email] Send failed:', err.message)
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

    const groqClient = getGroqClient()
    const completion = await groqClient.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: parentPrompt }],
      temperature: 0.6,
      max_tokens: 512,
    })
    const parentSummaryText = completion.choices[0].message.content.trim()
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'ai_call', callType: 'parent_summary', studentId: user.id, latencyMs: 0 }))

    // Cache it back to guidance_results
    await client.from('guidance_results').update({ parent_summary: parentSummaryText }).eq('id', guidanceResultId)

    res.json({ parent_summary: parentSummaryText, cached: false })
  } catch (err) {
    console.error('Parent summary error:', err.message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message })
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
    // Send confirmation email (fire-and-forget)
    const { data: profile } = await supabase.auth.admin?.getUserById?.(user.id).catch(() => ({ data: null })) || {}
    sendEmail(
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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

