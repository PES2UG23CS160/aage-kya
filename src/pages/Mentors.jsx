import { useState, useEffect } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const MENTORS = [
  {
    id: 1,
    name: 'Rahul S.',
    initials: 'RS',
    college: 'PES University',
    degree: 'B.E. Electronics & Communication',
    stream: 'PCB → ECE',
    city: 'Bengaluru',
    // TODO: Replace with real link from user once provided
    calLink: 'https://calendly.com/rahul-s-mentor/20min',
    story:
      'I missed NEET by 8 marks. Ended up in ECE. Here\'s what I wish someone told me.',
    tags: ['NEET dropout', 'Bio to Engineering', 'Career pivot'],
    gradient: 'from-blue-500/30 to-blue-600/10',
    border: 'border-blue-500/25',
    tag_color: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    initials_bg: 'bg-blue-500/20 text-blue-300',
    available: true,
  },
  {
    id: 2,
    name: 'Priya M.',
    initials: 'PM',
    college: 'NIT Surathkal',
    degree: 'B.Tech Computer Science',
    stream: 'PCM → CSE',
    city: 'Mangaluru',
    // TODO: Replace with real link from user once provided
    calLink: 'https://calendly.com/priya-m-mentor/20min',
    story:
      'First in my family to leave home for college. It was terrifying. I\'ll tell you exactly what helped.',
    tags: ['First-gen student', 'Hostel life', 'Scholarships'],
    gradient: 'from-purple-500/30 to-purple-600/10',
    border: 'border-purple-500/25',
    tag_color: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    initials_bg: 'bg-purple-500/20 text-purple-300',
    available: true,
  },
  {
    id: 3,
    name: 'Arjun K.',
    initials: 'AK',
    college: 'Manipal University',
    degree: 'BBA + Certification Finance',
    stream: 'Commerce',
    city: 'Pune',
    // TODO: Replace with real link from user once provided
    calLink: 'https://calendly.com/arjun-k-mentor/20min',
    story:
      'Family wanted CA. I wanted something else. Here\'s how I navigated that conversation.',
    tags: ['Family pressure', 'Commerce', 'Non-CA path'],
    gradient: 'from-emerald-500/30 to-emerald-600/10',
    border: 'border-emerald-500/25',
    tag_color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    initials_bg: 'bg-emerald-500/20 text-emerald-300',
    available: true,
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MentorCard({ mentor, index, isBestMatch }) {
  return (
    <div
      className={`glass-card flex flex-col hover:scale-[1.02] transition-all duration-300 overflow-hidden group animate-slide-up relative ${
        isBestMatch ? 'border-saffron/60 shadow-lg shadow-saffron/5 scale-[1.01]' : ''
      }`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Best Match Badge */}
      {isBestMatch && (
        <div className="absolute top-3 right-3 bg-saffron text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md z-10">
          ⭐ Best Match
        </div>
      )}
      {/* Top gradient strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${mentor.gradient} opacity-80`} />

      <div className="p-6 sm:p-8 flex flex-col gap-5 flex-1">

        {/* Avatar + name row */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${mentor.initials_bg} border ${mentor.border} flex items-center justify-center font-display font-bold text-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
            {mentor.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-white text-lg leading-tight">
                  {mentor.name}
                </h3>
                <p className="text-gray-400 text-sm mt-0.5 leading-snug">{mentor.degree}</p>
                <p className="text-saffron text-xs font-semibold mt-0.5">{mentor.college}</p>
              </div>
              {/* Available badge */}
              <span className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 text-xs text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Free
              </span>
            </div>
          </div>
        </div>

        {/* Meta: city + stream */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {mentor.city}
          </span>
          <span className="text-gray-700">·</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${mentor.tag_color}`}>
            {mentor.stream}
          </span>
        </div>

        {/* Story quote — main content */}
        <blockquote className="flex-1 relative">
          {/* Large decorative quote mark */}
          <span
            className="absolute -top-3 -left-1 text-5xl text-saffron/20 font-serif leading-none select-none pointer-events-none"
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <p className="text-gray-200 text-base leading-relaxed pl-4 font-medium italic relative z-10">
            {mentor.story}
          </p>
        </blockquote>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {mentor.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-navy-800 border border-white/8 text-gray-400 px-2.5 py-1 rounded-lg"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/6" />

        {/* CTA */}
        <a
          href={mentor.calLink}
          target="_blank"
          rel="noreferrer"
          className="btn-primary text-sm py-3 text-center flex items-center justify-center gap-2 group/btn"
        >
          <span>Book Free 20-min Call</span>
          <svg
            className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>

        <p className="text-center text-gray-600 text-xs">No sign-up needed · 20 minutes · Completely free</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Triage Concerns (Phase 7 — Situational Matching) ───────────────────────

const CONCERNS = [
  {
    id: 'neet',
    label: 'NEET/JEE Prep Hurdles 📚',
    desc: 'Missed cutoffs, drop years, or pivoting streams',
    stream_category: 'Science (PCB)',
    tag: 'NEET dropout'
  },
  {
    id: 'first-gen',
    label: 'First-Gen Student / Hostel Adjustments 🏠',
    desc: 'Leaving home or managing college culture shock',
    stream_category: 'Science (PCM)',
    tag: 'First-gen student'
  },
  {
    id: 'family',
    label: 'Family Pressure / Choosing Career Path 👨‍👩‍👧‍👦',
    desc: 'Choosing a path different from expectations or parent desires',
    stream_category: 'Commerce',
    tag: 'Family pressure'
  },
  {
    id: 'all',
    label: 'Explore All Mentors / General Guidance 🌟',
    desc: 'Browse and search our entire mentor roster',
    stream_category: 'All',
    tag: null
  }
]

export default function Mentors() {
  const [mentorsList, setMentorsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeConcern, setActiveConcern] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [volunteerForm, setVolunteerForm] = useState({
    name: '',
    email: '',
    college: '',
    degree: '',
    stream: '',
    story: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetch('http://localhost:5000/api/mentors')
      .then((res) => {
        if (!res.ok) throw new Error('API failed')
        return res.json()
      })
      .then((data) => {
        setMentorsList(data)
        setLoading(false)
      })
      .catch((err) => {
        console.warn('Could not fetch mentors from API, using fallbacks:', err)
        setMentorsList(MENTORS)
        setLoading(false)
      })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setVolunteerForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const tempErrors = {}
    if (!volunteerForm.name.trim()) tempErrors.name = 'Please enter your name.'
    
    if (!volunteerForm.email.trim()) {
      tempErrors.email = 'Please enter your email.'
    } else if (!/\S+@\S+\.\S+/.test(volunteerForm.email)) {
      tempErrors.email = 'Please enter a valid email address.'
    }
    
    if (!volunteerForm.college.trim()) tempErrors.college = 'Please enter your college name.'
    if (!volunteerForm.degree.trim()) tempErrors.degree = 'Please enter your degree/course.'
    if (!volunteerForm.stream.trim()) tempErrors.stream = 'e.g. PCM to CSE, PCB to ECE, Commerce.'
    if (!volunteerForm.story.trim()) tempErrors.story = 'Share a sentence about your path to help students.'
    
    setErrors(tempErrors)
    return Object.keys(tempErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('http://localhost:5000/api/mentors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(volunteerForm)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || err.error || 'Failed to submit application')
      }

      setIsSubmitted(true)
    } catch (err) {
      console.error('Submission error:', err.message)
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const matchesConcern = (mentor, concernId) => {
    if (!concernId || concernId === 'all') return false
    const selectedConcernObj = CONCERNS.find(c => c.id === concernId)
    if (!selectedConcernObj) return false
    const streamMatches = mentor.stream_category === selectedConcernObj.stream_category
    const tagMatches = selectedConcernObj.tag ? (mentor.tags || []).includes(selectedConcernObj.tag) : false
    return streamMatches || tagMatches
  }

  const handleConcernSelect = (concern) => {
    setActiveConcern(concern.id)
    if (concern.id !== 'all') {
      setActiveFilter('All')
    }
  }

  const resetConcern = () => {
    setActiveConcern(null)
  }

  const filteredMentors = mentorsList.filter((m) => {
    if (activeConcern && activeConcern !== 'all') {
      const selectedConcernObj = CONCERNS.find(c => c.id === activeConcern)
      if (selectedConcernObj) {
        const streamMatches = m.stream_category === selectedConcernObj.stream_category
        const tagMatches = selectedConcernObj.tag ? (m.tags || []).includes(selectedConcernObj.tag) : false
        return streamMatches || tagMatches
      }
    }
    if (activeFilter === 'All') return true
    return m.stream_category === activeFilter
  })

  const inputClass = (name) =>
    `w-full bg-navy-800 border rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-saffron/40 ${
      errors[name] ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30' : 'border-white/10 hover:border-white/20 focus:border-saffron/60'
    }`

  return (
    <main className="pt-24 pb-24 min-h-screen px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Talk to someone who{' '}
            <span className="gradient-text">actually gets it</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Not a counsellor. Not a coaching centre. Real students who were in your exact shoes — and figured it out.
          </p>
        </div>

        {/* ── Trust banner ── */}
        <div className="flex items-start sm:items-center gap-3 bg-saffron/8 border border-saffron/20 rounded-2xl px-5 py-4 mb-8 max-w-2xl mx-auto animate-fade-in">
          <span className="text-2xl flex-shrink-0 mt-0.5 sm:mt-0">🤝</span>
          <div>
            <p className="text-saffron font-semibold text-sm">
              All mentors volunteer their time. No spam, no sales.
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              Every mentor on this page chose to be here because someone helped them once.
            </p>
          </div>
        </div>

        {/* ── Interactive Concern Triage Flow (Phase 7 — Situational Matching) ── */}
        <div className="glass-card p-6 sm:p-8 mb-10 max-w-3xl mx-auto border-saffron/20 animate-fade-in">
          <h2 className="font-display text-lg sm:text-xl font-bold text-white mb-4 text-center">
            What is your biggest concern or hurdle right now?
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {CONCERNS.map((concern) => {
              const active = activeConcern === concern.id
              return (
                <button
                  key={concern.id}
                  type="button"
                  onClick={() => handleConcernSelect(concern)}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                    active
                      ? 'bg-saffron/15 border-saffron text-white shadow-md shadow-saffron/20 scale-[1.01]'
                      : 'bg-navy-800 border-white/10 text-gray-300 hover:border-saffron/30 hover:bg-saffron/5'
                  }`}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-white">{concern.label}</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-snug">{concern.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          
          {activeConcern !== null && activeConcern !== 'all' && (
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/5">
              <p className="text-xs text-gray-400">
                Roster filtered to show relevant seniors who overcame this challenge.
              </p>
              <button
                type="button"
                onClick={resetConcern}
                className="text-xs text-saffron hover:underline font-semibold"
              >
                Clear filter & browse all →
              </button>
            </div>
          )}
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 animate-fade-in">
          {['All', 'Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts / Humanities'].map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                activeFilter === category
                  ? 'bg-saffron border-saffron text-white shadow-lg shadow-saffron/20'
                  : 'bg-navy-800 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* ── Cards grid ── */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card flex flex-col p-6 sm:p-8 gap-5 border-white/5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-white/10 rounded w-2/3" />
                    <div className="h-4 bg-white/5 rounded w-1/2" />
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 bg-white/5 rounded w-1/4" />
                  <div className="h-4 bg-white/5 rounded w-1/4" />
                </div>
                <div className="flex-1 space-y-2 py-2">
                  <div className="h-4 bg-white/5 rounded w-full" />
                  <div className="h-4 bg-white/5 rounded w-5/6" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-white/5 rounded w-12" />
                  <div className="h-6 bg-white/5 rounded w-16" />
                </div>
                <div className="h-10 bg-white/10 rounded-xl w-full mt-2" />
              </div>
            ))}
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="text-center py-12 glass-card max-w-xl mx-auto mb-16 border-white/10">
            <p className="text-gray-400 text-base mb-1">No mentors found for this stream category.</p>
            <p className="text-gray-500 text-xs">Try choosing another stream or volunteer to become a mentor!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {filteredMentors.map((mentor, i) => (
              <MentorCard 
                key={mentor.id} 
                mentor={mentor} 
                index={i} 
                isBestMatch={activeConcern !== null && activeConcern !== 'all' && matchesConcern(mentor, activeConcern)} 
              />
            ))}
          </div>
        )}

        {/* ── What to expect ── */}
        <div className="glass-card p-8 sm:p-10 mb-12 max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-7 text-center">
            What happens on the call?
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '🗣️', step: '1', title: 'You talk', desc: 'Tell them your situation — marks, stream, what you\'re confused about. No judgment.' },
              { icon: '💬', step: '2', title: 'They share', desc: 'They\'ll tell you what they actually did, what worked, and what they\'d do differently.' },
              { icon: '📋', step: '3', title: 'You leave with clarity', desc: 'Not a plan handed to you — but enough real info to make a better decision yourself.' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-saffron/10 border border-saffron/20 flex items-center justify-center text-2xl mx-auto mb-3">
                  {icon}
                </div>
                <p className="text-saffron text-xs font-bold uppercase tracking-wider mb-1">Step {step}</p>
                <h3 className="font-display font-bold text-white text-base mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Become a mentor CTA ── */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">
            Were you in their position once? Help the next student.
          </p>
          <button
            onClick={() => {
              setIsSubmitted(false)
              setErrors({})
              setVolunteerForm({ name: '', email: '', college: '', degree: '', stream: '', story: '' })
              setIsModalOpen(true)
            }}
            className="btn-outline text-sm px-8 py-3"
          >
            Volunteer as a Mentor →
          </button>
        </div>
      </div>

      {/* ── Volunteer Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 sm:p-8 border-saffron/30 relative animate-slide-up shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl"
              aria-label="Close modal"
            >
              &times;
            </button>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-saffron/10 border border-saffron/30 flex items-center justify-center text-2xl mx-auto mb-3">
                    🙌
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">Volunteer as a Mentor</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Help post-12th students navigate their career choices honestly.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={volunteerForm.name}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                      className={inputClass('name')}
                    />
                    {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={volunteerForm.email}
                      onChange={handleChange}
                      placeholder="e.g. rahul@example.com"
                      className={inputClass('email')}
                    />
                    {errors.email && <p className="text-[10px] text-rose-400 mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Current College *</label>
                    <input
                      type="text"
                      name="college"
                      value={volunteerForm.college}
                      onChange={handleChange}
                      placeholder="e.g. PES University"
                      className={inputClass('college')}
                    />
                    {errors.college && <p className="text-[10px] text-rose-400 mt-1">{errors.college}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Degree / Course *</label>
                    <input
                      type="text"
                      name="degree"
                      value={volunteerForm.degree}
                      onChange={handleChange}
                      placeholder="e.g. B.Tech Computer Science"
                      className={inputClass('degree')}
                    />
                    {errors.degree && <p className="text-[10px] text-rose-400 mt-1">{errors.degree}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Stream Transition *</label>
                  <input
                    type="text"
                    name="stream"
                    value={volunteerForm.stream}
                    onChange={handleChange}
                    placeholder="e.g. PCM to CSE, PCB to ECE, Commerce"
                    className={inputClass('stream')}
                  />
                  {errors.stream && <p className="text-[10px] text-rose-400 mt-1">{errors.stream}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Your Story / Advice (1 sentence) *</label>
                  <textarea
                    name="story"
                    rows="3"
                    value={volunteerForm.story}
                    onChange={handleChange}
                    placeholder="e.g. I wanted to pursue medicine but shifted to engineering, let me share how to survive this shift."
                    className={`${inputClass('story')} resize-none`}
                  />
                  {errors.story && <p className="text-[10px] text-rose-400 mt-1">{errors.story}</p>}
                </div>

                {submitError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-4">
                    ⚠️ {submitError}
                  </div>
                )}

                <div className="pt-2">
                  <button type="submit" disabled={submitting} className="w-full btn-primary py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting && (
                      <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {submitting ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
                  ✅
                </div>
                <h2 className="font-display text-2xl font-bold text-white mb-2">Awesome, {volunteerForm.name}!</h2>
                <p className="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto mb-6">
                  Thank you for volunteering to support Indian students. We will review your application and send you an onboarding email at <span className="text-saffron font-medium">{volunteerForm.email}</span> within 3-4 days.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn-primary px-8 py-3 text-sm"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
