import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
app.use(cors())
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

const guidanceLimiter = createRateLimiter(5, 86400000, "You can only generate 5 career guidance reports per day to prevent system abuse. Please try again tomorrow.")
const roadmapLimiter = createRateLimiter(5, 86400000, "You can only generate 5 career roadmaps per day to prevent system abuse. Please try again tomorrow.")
const mentorApplyLimiter = createRateLimiter(1, 3600000, "You can only submit one application per hour. Please try again later.")
const transcribeLimiter = createRateLimiter(15, 3600000, "You have exceeded the transcription rate limit. Please try again in an hour.")



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

// Initialize Gemini SDK if API key exists
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('NO_API_KEY')
  }
  return new GoogleGenerativeAI(apiKey)
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

// Retrieve authenticated user from Supabase token
async function getAuthUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user
  } catch (err) {
    return null
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
${collegesSection}${scholarshipsSection}${groundingInstruction}
Respond ONLY in this exact JSON structure (no markdown, no backticks, just raw JSON):
{
  "summary": "A warm, honest 2-3 sentence summary of this student's situation and what makes their path unique. Be specific to their actual marks and stream.",
  "options": [
    {
      "path": "Career / course path name",
      "honest_take": "2-3 sentences of brutally honest, specific advice about this path for THIS student given their marks, income, and stream. No fluff.",
      "realistic_colleges": ["Use college names from the VERIFIED LIST. 3-4 colleges realistic for this specific option and the student's marks."],
      "avg_yearly_cost": "Realistic total yearly cost range in INR/year (tuition + hostel + misc) based on the colleges you selected",
      "opens_doors_to": ["3-4 specific career roles or further study options this path leads to"],
      "watch_out_for": "One specific, honest warning about this path — what most people don't tell you"
    }
  ],
  "scholarship_to_check": "The exact name of the most relevant scholarship from the VERIFIED SCHOLARSHIPS list, followed by one sentence on why it fits this student.",
  "one_thing_to_do_this_week": "One concrete, specific action they can take in the next 7 days. Not vague. Not 'research your options'. Something real."
}

Give 2-3 options. Make them genuinely different from each other. Be honest about costs — Indian parents underestimate them.`
}

// Roadmap Prompt Builder
function buildRoadmapPrompt(form, option) {
  const income  = INCOME_LABELS[form.incomeRange] || form.incomeRange || 'Not specified'
  const cities  = (form.preferredCities || []).map((c) => CITY_LABELS[c] || c).join(', ') || 'Not specified'
  const firstGen = form.firstGenCollege === true ? 'Yes' : form.firstGenCollege === false ? 'No' : 'Not specified'

  return `You are an expert career counsellor, mentor, and academic advisor for Indian students.
Generate a detailed 4-year learning, skill, project, and certification roadmap to achieve a career as a "${option.path}" (Honest Take context: ${option.honest_take}).
Tailor this roadmap specifically to this student's profile:
- 12th Board: ${form.board || 'Not specified'}
- Stream: ${form.stream || 'Not specified'}
- 12th Marks: ${form.marks || 'Not specified'}%
- State: ${form.state || 'Not specified'}
- Family Income: ${income}
- First Generation College Student: ${firstGen}
- Preferred Study Location: ${cities}
- Interests: ${form.interests || 'Not specified'}
- Biggest Fear: ${form.biggestFear || 'Not specified'}

Income-Based Customization:
If family income is low (e.g. Below 2.5L or 2.5-5L), prioritize free/affordable learning resources, certifications (like Google Career Certificates on Coursera with financial aid, NPTEL/Swayam which is free/low cost in India, FreeCodeCamp), and open-source contributions. Avoid expensive bootcamps or paid certifications.

Academic/College Customization:
If marks are low (below 75%) or they are likely entering a tier-3 local college, explicitly focus the advice on building a strong portfolio, networking on LinkedIn, open-source work, and off-campus placements.

Biggest Fear Customization:
Integrate specific activities or milestones directly addressing their biggest fear (e.g. public speaking, math anxiety, financial burden) during their college years.

Respond ONLY in this exact JSON structure (no markdown, no backticks, just raw JSON):
{
  "career_path": "${option.path}",
  "overview": "A warm, honest 2-3 sentence overview of this 4-year skill-building journey tailored to their stream, marks, and constraints. Be highly specific.",
  "years": [
    {
      "year": 1,
      "focus": "Theme/focus of Year 1 (e.g., Programming Fundamentals & Web Basics)",
      "skills": ["3-4 specific skills to master this year"],
      "certifications": ["1-2 specific, highly valuable certifications to aim for (prioritize free/low-cost or financial-aid options if income is low)"],
      "internships_projects": ["2 specific, practical projects or open-source tasks to complete"],
      "milestones": ["2 key milestones to achieve by the end of Year 1 (e.g., Create GitHub portfolio, Build a personal site)"]
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
}

Provide highly specific, actionable, and realistic advice for Indian students. Do not give generic advice. Keep the names of skills and certifications real and relevant.`
}

// Helper to call Gemini and clean output
async function callGemini(prompt) {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Clean markdown backticks if model ignores JSON instruction
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned)
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
        return res.json({
          summary: cached.summary,
          options: cached.options,
          scholarship_to_check: cached.scholarship_to_check,
          one_thing_to_do_this_week: cached.one_thing_to_do_this_week,
          cached: true,
          grounded: false, // cached results predate the RAG enrichment
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
    const result = await callGemini(prompt)

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
        updated_at: new Date().toISOString()
      })

      // Save results
      await client.from('guidance_results').insert({
        student_id: user.id,
        summary: result.summary,
        options: result.options,
        scholarship_to_check: result.scholarship_to_check,
        one_thing_to_do_this_week: result.one_thing_to_do_this_week
      })
    }

    res.json({
      ...result,
      grounded,
      colleges_data,
      scholarship_data,
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
app.post('/api/transcribe', transcribeLimiter, async (req, res) => {
  try {
    const { audio, mimeType } = req.body
    if (!audio) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing audio data' })
    }

    const client = getGeminiClient()
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const audioPart = {
      inlineData: {
        data: audio,
        mimeType: mimeType || 'audio/webm'
      }
    }

    const prompt = "Transcribe this audio precisely. If the spoken language is Hindi, Kannada, Tamil, Telugu, or any other Indian regional language, translate it directly into English. Output only the English translation/transcription text, with absolutely no notes, meta commentary, or extra text."

    const result = await model.generateContent([prompt, audioPart])
    const text = result.response.text().trim()

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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

