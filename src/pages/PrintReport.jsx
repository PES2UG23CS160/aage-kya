import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function PrintReport() {
  const { classLevel = 'class12' } = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Initialize from localStorage fallbacks immediately
  const [guidance, setGuidance] = useState(() => {
    try {
      const saved = localStorage.getItem('aageKyaLastResult')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [activeProfile, setActiveProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('aageKyaLastFormData') || localStorage.getItem('aageKyaFormData')
      if (saved) {
        const form = JSON.parse(saved)
        return {
          full_name: form.fullName || 'Student',
          marks: form.marks || '0',
          board: form.board || '',
          state: form.state || '',
          stream: form.stream || '',
          risk_comfort: form.riskComfort || '',
          interests: form.interests || '',
          biggest_fear: form.biggestFear || '',
          class_level: form.classLevel || classLevel
        }
      }
      return null
    } catch { return null }
  })
  const [matchedMentor, setMatchedMentor] = useState(null)
  const [scholarshipsList, setScholarshipsList] = useState(() => {
    try {
      const saved = localStorage.getItem('aageKyaLastResult')
      if (saved) {
        const resData = JSON.parse(saved)
        return resData.scholarships_list || []
      }
      return []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(true)

  // Redirect if not logged in AND no local fallback data is available
  useEffect(() => {
    if (!authLoading && !user) {
      const hasLocalData = localStorage.getItem('aageKyaLastResult') && (localStorage.getItem('aageKyaLastFormData') || localStorage.getItem('aageKyaFormData'))
      if (!hasLocalData) {
        navigate('/')
      }
    }
  }, [user, authLoading, navigate])

  // Load report data
  useEffect(() => {
    if (!user || !profile) {
      // For anonymous users, still attempt to fetch matching mentor based on stream in local state
      const fetchMentorOnly = async () => {
        const streamToMatch = activeProfile?.stream || 'Class 10 / Stream Selection'
        try {
          const res = await fetch('http://localhost:5000/api/mentors')
          if (res.ok) {
            const mentors = await res.json()
            const match = mentors.find(m => {
              if (classLevel === 'class10') {
                return m.stream_category === 'Class 10 / Stream Selection' && m.available
              }
              return m.stream_category === streamToMatch && m.available
            })
            setMatchedMentor(match || null)
          }
        } catch (err) {
          console.error('Error fetching mentor for anonymous print:', err)
        } finally {
          setLoading(false)
        }
      }
      if (activeProfile) {
        fetchMentorOnly()
      } else {
        setLoading(false)
      }
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        // Fetch cached guidance result
        const { data: g } = await supabase
          .from('guidance_results')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (g) {
          setGuidance(g)
          setScholarshipsList(g.scholarships_list || [])
        }

        // Set activeProfile from Supabase profile
        setActiveProfile({
          full_name: profile.full_name || 'Student',
          marks: profile.marks || '0',
          board: profile.board || '',
          state: profile.state || '',
          stream: profile.stream || '',
          risk_comfort: profile.risk_comfort || '',
          interests: profile.interests || '',
          biggest_fear: profile.biggest_fear || '',
          class_level: profile.class_level || classLevel
        })

        // Fetch matching mentor
        const streamToMatch = profile.stream || 'Class 10 / Stream Selection'
        const res = await fetch('http://localhost:5000/api/mentors')
        if (res.ok) {
          const mentors = await res.json()
          const match = mentors.find(m => {
            if (classLevel === 'class10') {
              return m.stream_category === 'Class 10 / Stream Selection' && m.available
            }
            return m.stream_category === streamToMatch && m.available
          })
          setMatchedMentor(match || null)
        }
      } catch (err) {
        console.error('Error loading report for print:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, profile, classLevel, activeProfile?.stream])

  // Auto trigger print dialog on load once content is loaded
  useEffect(() => {
    if (!loading && guidance) {
      const timer = setTimeout(() => {
        window.print()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [loading, guidance])

  if (authLoading || loading) {
    return (
      <main className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-[#0A0F1E] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Preparing report print document...</span>
        </div>
      </main>
    )
  }

  if (!activeProfile || !guidance) {
    return (
      <main className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-[#0A0F1E] text-white">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-4">No guidance report was found to print.</p>
          <Link to="/dashboard" className="btn-primary py-2 px-6">Back to Dashboard</Link>
        </div>
      </main>
    )
  }

  const printDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <>
      {/* CSS overrides specifically for printing */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-family: system-ui, -apple-system, sans-serif !important;
          }
          nav, footer, .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          .glass-card, .bg-white\\/4, .bg-navy-800, .bg-navy-900, .bg-navy {
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            color: black !important;
            box-shadow: none !important;
          }
          h1, h2, h3, h4, p, span, strong, li {
            color: black !important;
          }
          .text-gray-400, .text-gray-500, .text-gray-600 {
            color: #4b5563 !important;
          }
          .text-saffron, .gradient-text {
            color: #d97706 !important;
            background: none !important;
            -webkit-text-fill-color: initial !important;
          }
          .border-white\\/10, .border-white\\/5, .border-white\\/8 {
            border-color: #cbd5e1 !important;
          }
          .badge {
            border: 1px solid #94a3b8 !important;
            background: #f1f5f9 !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Main Print Layout Wrapper */}
      <main className="pt-24 pb-20 min-h-screen bg-[#0A0F1E] text-white px-4 sm:px-6 lg:px-8 print-container">
        <div className="max-w-4xl mx-auto">
          
          {/* Floating Actions for web viewer */}
          <div className="mb-8 flex justify-between items-center no-print bg-[#0F172A] border border-white/10 rounded-2xl p-4">
            <Link
              to="/dashboard"
              className="text-sm text-gray-400 hover:text-saffron transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Dashboard
            </Link>

            <button
              onClick={() => window.print()}
              className="btn-primary py-2 px-5 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-saffron/15"
            >
              <span>🖨️</span>
              <span>Print Report / Save PDF</span>
            </button>
          </div>

          {/* Document Content */}
          <div className="bg-navy-900 border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl relative">
            {/* Header branding */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-saffron flex items-center justify-center text-white font-bold text-xs">
                    AK
                  </div>
                  <span className="font-display font-bold text-lg text-white">Aage Kya?</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-white mt-2 leading-tight">
                  Career Guidance Report
                </h1>
                <p className="text-gray-400 text-xs mt-1">Generated dynamically based on honest student assessments</p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Assessment Date</span>
                <span className="text-white text-sm font-semibold block mt-0.5">{printDate}</span>
                <span className="text-saffron text-xs font-bold block mt-1 uppercase tracking-widest">
                  {activeProfile.class_level === 'class10' ? 'Class 10 Selection' : 'Class 12 Pathway'}
                </span>
              </div>
            </div>

            {/* Profile Inputs Summary Section */}
            <div className="mb-8">
              <h2 className="text-xs uppercase font-bold text-saffron tracking-widest mb-3">1. Student Assessment Profile</h2>
              <div className="bg-white/4 border border-white/8 rounded-2xl p-6 grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Student Name</span>
                  <span className="text-white text-sm font-bold block mt-0.5">{activeProfile.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Academic Marks</span>
                  <span className="text-white text-sm font-bold block mt-0.5">{activeProfile.marks}% ({activeProfile.board})</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">State / Region</span>
                  <span className="text-white text-sm font-bold block mt-0.5">{activeProfile.state}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Risk Profile</span>
                  <span className="text-white text-sm font-bold block mt-0.5 capitalize">{activeProfile.risk_comfort || 'Safe'}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Interests & Drivers</span>
                  <p className="text-gray-300 text-xs leading-relaxed mt-1.5">"{activeProfile.interests}"</p>
                </div>
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Biggest Concern</span>
                  <p className="text-gray-300 text-xs leading-relaxed mt-1.5">"{activeProfile.biggest_fear}"</p>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="mb-8">
              <h2 className="text-xs uppercase font-bold text-saffron tracking-widest mb-3">2. Evaluation Summary</h2>
              <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-saffron pl-4">
                {guidance.summary}
              </p>
            </div>

            {/* Recommendation Options */}
            <div className="mb-8">
              <h2 className="text-xs uppercase font-bold text-saffron tracking-widest mb-4">3. Recommended Pathways</h2>
              <div className="space-y-6">
                {(guidance.options || []).map((opt, i) => (
                  <div key={i} className="border border-white/10 rounded-2xl p-6 bg-white/4 relative">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-saffron flex items-center justify-center text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <h3 className="font-bold text-white text-base leading-tight">{opt.path}</h3>
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed mt-2.5">{opt.honest_take}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Est. Cost/Yr</span>
                        <span className="text-white text-sm font-bold block mt-0.5">{opt.avg_yearly_cost}</span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-4">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Recommended Targets</span>
                        <ul className="space-y-1 mt-1.5">
                          {(opt.realistic_colleges || []).map((c, idx) => (
                            <li key={idx} className="text-xs text-gray-300 flex items-center gap-1.5">
                              <span className="text-saffron">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Careers Opened</span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(opt.opens_doors_to || []).map((d, idx) => (
                            <span key={idx} className="text-[9px] bg-navy-800 border border-white/5 text-gray-300 px-2 py-0.5 rounded">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Backup Plan */}
                    {opt.backup_plan && (
                      <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-300">
                        <strong className="text-white block mb-1">🛡️ Safety Net / Backup Plan</strong>
                        {opt.backup_plan}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mentor Details */}
            {matchedMentor && (
              <div className="mb-8">
                <h2 className="text-xs uppercase font-bold text-saffron tracking-widest mb-3">4. Connected Advisor</h2>
                <div className="border border-white/10 rounded-2xl p-5 bg-white/4 flex items-center gap-4">
                  <div className="text-2xl shrink-0">👤</div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{matchedMentor.name}</h3>
                    <p className="text-gray-400 text-xs">{matchedMentor.headline} · {matchedMentor.experience_years} yrs experience</p>
                    <p className="text-gray-300 text-xs mt-1.5 leading-relaxed">{matchedMentor.bio}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Scholarships Details */}
            {scholarshipsList.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xs uppercase font-bold text-saffron tracking-widest mb-3">5. Matching Scholarships</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {scholarshipsList.slice(0, 4).map((s, idx) => (
                    <div key={idx} className="border border-white/10 rounded-xl p-4 bg-white/4">
                      <h4 className="text-white font-bold text-xs">{s.name}</h4>
                      <p className="text-gray-400 text-[11px] mt-1 leading-relaxed line-clamp-2">{s.description}</p>
                      {s.deadline_pattern && (
                        <span className="text-[10px] text-saffron font-bold block mt-2">⏱️ Pattern: {s.deadline_pattern}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Signoff */}
            <div className="border-t border-white/10 pt-6 mt-12 flex justify-between items-center">
              <span className="text-[10px] text-gray-500">© 2026 Aage Kya? Career Guidance Platform</span>
              <span className="text-[10px] text-gray-500">Page 1 of 1</span>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
