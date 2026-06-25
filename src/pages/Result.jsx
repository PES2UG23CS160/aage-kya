import { useEffect, useState, useCallback } from 'react'
import { useLocation, Link } from 'react-router-dom'

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

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

// ─── Gemini call ─────────────────────────────────────────────────────────────

function buildPrompt(form) {
  const income  = INCOME_LABELS[form.incomeRange] || form.incomeRange || 'Not specified'
  const cities  = (form.preferredCities || []).map((c) => CITY_LABELS[c] || c).join(', ') || 'Not specified'
  const firstGen = form.firstGenCollege === true ? 'Yes' : form.firstGenCollege === false ? 'No' : 'Not specified'

  return `You are an honest, caring guide for Indian students after 12th grade. Give REAL, specific advice. Not generic. Not motivational fluff.

Student: Board: ${form.board || 'Not specified'}, Stream: ${form.stream || 'Not specified'}, Marks: ${form.marks || 'Not specified'}%, State: ${form.state || 'Not specified'}, Income: ${income}, First gen: ${firstGen}, Preferred study location: ${cities}, Interests: ${form.interests || 'Not specified'}, Biggest fear: ${form.biggestFear || 'Not specified'}

Respond ONLY in this exact JSON structure (no markdown, no backticks, just raw JSON):
{
  "summary": "A warm, honest 2-3 sentence summary of this student's situation and what makes their path unique. Be specific to their actual marks and stream.",
  "options": [
    {
      "path": "Career / course path name",
      "honest_take": "2-3 sentences of brutally honest, specific advice about this path for THIS student given their marks, income, and stream. No fluff.",
      "realistic_colleges": ["List 3-4 actual Indian colleges/institutions realistic for their marks and state"],
      "avg_yearly_cost": "Realistic total yearly cost in INR (tuition + hostel + misc) as a range",
      "opens_doors_to": ["3-4 specific career roles or further study options this path leads to"],
      "watch_out_for": "One specific, honest warning about this path — what most people don't tell you"
    }
  ],
  "scholarship_to_check": "Name one specific, real scholarship or scheme this student should look up immediately, with a sentence about eligibility.",
  "one_thing_to_do_this_week": "One concrete, specific action they can take in the next 7 days. Not vague. Not 'research your options'. Something real."
}

Give 2-3 options. Make them genuinely different from each other. Be honest about costs — Indian parents underestimate them.`
}

async function callGemini(form) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('NO_API_KEY')

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(form) }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }

  const data = await res.json()
  const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Strip markdown fences if model ignored the instruction
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned)
}

// ─── Micro-components ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      {/* Animated rings */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-white/5" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-saffron animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-saffron/40 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🤔</div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-white font-semibold text-lg font-display">Thinking honestly…</p>
        <p className="text-gray-400 text-sm">Gemini is reading your answers carefully</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-saffron animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function NoApiKey() {
  return (
    <div className="glass-card p-8 text-center border-amber-500/30">
      <div className="text-5xl mb-4">🔑</div>
      <h2 className="font-display text-xl font-bold text-white mb-2">API Key Missing</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
        Add your Gemini API key to the <code className="bg-navy-800 px-2 py-0.5 rounded text-saffron text-xs">.env</code> file to generate personalised guidance.
      </p>
      <div className="bg-navy-800 border border-white/10 rounded-xl p-4 text-left text-sm font-mono text-emerald-400 mb-6">
        VITE_GEMINI_API_KEY=your_key_here
      </div>
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noreferrer"
        className="btn-primary text-sm px-6 py-3 inline-block"
      >
        Get Free API Key →
      </a>
      <p className="text-gray-600 text-xs mt-4">Free tier · No credit card needed</p>
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="glass-card p-8 text-center border-rose-500/25">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="font-display text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto font-mono bg-navy-800 rounded-lg px-4 py-3 border border-white/8">
        {message}
      </p>
      <button onClick={onRetry} className="btn-primary text-sm px-8 py-3">
        Try Again
      </button>
    </div>
  )
}

function NoFormData() {
  return (
    <div className="glass-card p-10 text-center">
      <div className="text-5xl mb-4">📋</div>
      <h2 className="font-display text-2xl font-bold text-white mb-3">No answers found</h2>
      <p className="text-gray-400 mb-8">Fill in the form first so we can personalise your guidance.</p>
      <Link to="/onboarding" className="btn-primary px-8 py-4 text-base inline-block">
        Start the Form →
      </Link>
    </div>
  )
}

// ─── Result display components ────────────────────────────────────────────────

function SummaryCard({ summary, name }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-7 sm:p-9 mb-6 animate-slide-up"
      style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.18) 0%, rgba(255,107,0,0.06) 60%, rgba(15,23,42,0) 100%)', border: '1px solid rgba(255,107,0,0.3)' }}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-saffron via-saffron-light to-transparent" />
      {/* Glow orb */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-saffron/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✨</span>
          <span className="text-saffron text-xs font-bold uppercase tracking-widest">Your Honest Summary</span>
        </div>
        {name && (
          <p className="text-gray-400 text-sm mb-2">
            For <span className="text-white font-semibold">{name}</span>
          </p>
        )}
        <p className="text-white text-lg leading-relaxed font-medium">{summary}</p>
      </div>
    </div>
  )
}

function OptionCard({ option, index }) {
  const colorMap = ['border-blue-500/25', 'border-purple-500/25', 'border-emerald-500/25']
  const accentMap = ['text-blue-400', 'text-purple-400', 'text-emerald-400']
  const bgMap = ['bg-blue-500/8', 'bg-purple-500/8', 'bg-emerald-500/8']

  return (
    <div
      className={`glass-card p-6 sm:p-8 flex flex-col gap-5 hover:scale-[1.01] transition-all duration-300 animate-slide-up ${colorMap[index] || 'border-white/15'}`}
      style={{ animationDelay: `${(index + 1) * 120}ms` }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl ${bgMap[index]} flex items-center justify-center font-display font-bold text-lg ${accentMap[index]} border border-current/20 flex-shrink-0`}>
          {index + 1}
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-white leading-tight">{option.path}</h3>
          <p className={`text-xs font-semibold mt-1 ${accentMap[index]}`}>Option {index + 1}</p>
        </div>
      </div>

      {/* Honest take */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-4">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">💬 Honest Take</p>
        <p className="text-gray-200 text-sm leading-relaxed">{option.honest_take}</p>
      </div>

      {/* Grid: colleges + cost */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">🏫 Realistic Colleges</p>
          <ul className="space-y-1.5">
            {(option.realistic_colleges || []).map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-saffron mt-0.5 text-xs flex-shrink-0">▸</span>
                <span className="text-gray-300 text-sm">{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">💰 Avg Yearly Cost</p>
          <p className="text-white font-display font-bold text-xl">{option.avg_yearly_cost}</p>
          <p className="text-gray-500 text-xs mt-1">tuition + hostel + misc</p>

          <div className="mt-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">🚀 Opens Doors To</p>
            <div className="flex flex-wrap gap-1.5">
              {(option.opens_doors_to || []).map((d, i) => (
                <span key={i} className="text-xs bg-navy-700 border border-white/10 text-gray-300 px-2.5 py-1 rounded-lg">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Watch out */}
      <div className="flex items-start gap-3 bg-rose-500/8 border border-rose-500/20 rounded-xl p-4">
        <span className="text-rose-400 text-lg flex-shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">Watch Out For</p>
          <p className="text-rose-200 text-sm leading-relaxed">{option.watch_out_for}</p>
        </div>
      </div>
    </div>
  )
}

function ScholarshipBox({ scholarship }) {
  return (
    <div
      className="rounded-2xl p-6 sm:p-8 flex items-start gap-5 animate-slide-up"
      style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(15,23,42,0.8) 100%)', border: '1px solid rgba(34,197,94,0.25)' }}
    >
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-2xl flex-shrink-0">
        🎓
      </div>
      <div>
        <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">Scholarship to Check This Week</p>
        <p className="text-white text-base leading-relaxed font-medium">{scholarship}</p>
        <p className="text-gray-500 text-xs mt-2">Search this exact name on the National Scholarship Portal (scholarships.gov.in)</p>
      </div>
    </div>
  )
}

function OneActionBox({ action }) {
  return (
    <div
      className="rounded-2xl p-6 sm:p-8 animate-slide-up"
      style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.12) 0%, rgba(15,23,42,0.9) 100%)', border: '1px solid rgba(255,107,0,0.3)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-saffron/20 border border-saffron/30 flex items-center justify-center text-xl">
          ⚡
        </div>
        <p className="text-saffron text-xs font-bold uppercase tracking-widest">Your One Action This Week</p>
      </div>
      <p className="text-white text-xl font-display font-bold leading-snug">{action}</p>
      <div className="mt-5 flex items-center gap-2">
        <div className="flex-1 h-px bg-saffron/20" />
        <span className="text-saffron/60 text-xs">Do this before anything else</span>
        <div className="flex-1 h-px bg-saffron/20" />
      </div>
    </div>
  )
}

// ─── Student profile pill strip ───────────────────────────────────────────────

function ProfileStrip({ form }) {
  const pills = [
    form.board,
    form.stream,
    form.marks && `${form.marks}%`,
    form.state,
    INCOME_LABELS[form.incomeRange],
  ].filter(Boolean)

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {pills.map((p) => (
        <span key={p} className="text-xs bg-navy-800 border border-white/10 text-gray-300 px-3 py-1.5 rounded-full font-medium">
          {p}
        </span>
      ))}
      <Link to="/onboarding" className="text-xs text-saffron border border-saffron/30 px-3 py-1.5 rounded-full font-medium hover:bg-saffron/10 transition-colors">
        ✏️ Edit Answers
      </Link>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Result() {
  const { state } = useLocation()
  const savedRaw  = localStorage.getItem('aageKyaFormData')
  const formData  = state?.formData ?? (savedRaw ? JSON.parse(savedRaw) : null)

  const [status,  setStatus]  = useState('idle')   // idle | loading | success | error
  const [result,  setResult]  = useState(null)
  const [errorMsg, setErrMsg] = useState('')

  const fetchGuidance = useCallback(async () => {
    if (!formData) return
    setStatus('loading')
    setResult(null)
    setErrMsg('')
    try {
      const data = await callGemini(formData)
      setResult(data)
      setStatus('success')
    } catch (err) {
      if (err.message === 'NO_API_KEY') {
        setStatus('no_key')
      } else {
        setErrMsg(err.message)
        setStatus('error')
      }
    }
  }, [formData])

  useEffect(() => {
    fetchGuidance()
  }, [fetchGuidance])

  return (
    <main className="pt-24 pb-24 min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        {/* Page header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-saffron/10 border border-saffron/25 rounded-full px-4 py-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
            <span className="text-saffron text-sm font-semibold">AI-Powered · Honest · Specific to You</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">
            Your Personalised{' '}
            <span className="gradient-text">Guidance</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg">
            Based on <em>your</em> actual situation — not generic advice.
          </p>
        </div>

        {/* Profile pills */}
        {formData && <ProfileStrip form={formData} />}

        {/* ── States ── */}

        {/* No form data */}
        {!formData && <NoFormData />}

        {/* Loading */}
        {formData && status === 'loading' && <Spinner />}

        {/* No API key */}
        {status === 'no_key' && <NoApiKey />}

        {/* Error */}
        {status === 'error' && (
          <ErrorCard message={errorMsg} onRetry={fetchGuidance} />
        )}

        {/* Success */}
        {status === 'success' && result && (
          <div className="space-y-6">

            {/* 1 — Summary */}
            <SummaryCard
              summary={result.summary}
              name={formData?.fullName}
            />

            {/* 2 — Options */}
            {(result.options || []).map((opt, i) => (
              <OptionCard key={i} option={opt} index={i} />
            ))}

            {/* 3 — Scholarship */}
            {result.scholarship_to_check && (
              <ScholarshipBox scholarship={result.scholarship_to_check} />
            )}

            {/* 4 — One action */}
            {result.one_thing_to_do_this_week && (
              <OneActionBox action={result.one_thing_to_do_this_week} />
            )}

            {/* ── Bottom CTA ── */}
            <div className="pt-4 space-y-4">
              <div className="glass-card p-7 text-center border-saffron/20">
                <p className="text-gray-300 text-base mb-2 font-medium">
                  Still confused? A real mentor can answer your specific questions.
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Free 30-min call · No pitch · Just honest advice from someone who&apos;s been there
                </p>
                <Link
                  to="/mentors"
                  id="mentor-cta"
                  className="btn-primary px-10 py-4 text-base inline-block"
                >
                  Talk to a Mentor →
                </Link>
              </div>

              {/* Retry / redo */}
              <div className="flex justify-center gap-4 text-sm">
                <button
                  onClick={fetchGuidance}
                  className="text-gray-500 hover:text-saffron transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </button>
                <span className="text-gray-700">·</span>
                <Link to="/onboarding" className="text-gray-500 hover:text-white transition-colors">
                  Change My Answers
                </Link>
              </div>

              <p className="text-center text-gray-700 text-xs">
                Results are generated by Gemini AI and may not be exhaustive. Always verify college details and costs directly.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
