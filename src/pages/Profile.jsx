import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [guidance, setGuidance]   = useState(null)
  const [roadmaps, setRoadmaps]   = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate('/')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setDataLoading(true)
      const [{ data: g }, { data: r }] = await Promise.all([
        supabase.from('guidance_results').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('roadmaps').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
      ])
      setGuidance(g)
      setRoadmaps(r || [])
      setDataLoading(false)
    }
    load()
  }, [user])

  if (authLoading) return (
    <main className="pt-24 pb-16 min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
    </main>
  )
  if (!user) return null

  const initials = user.email?.[0]?.toUpperCase() ?? '?'
  const joinDate  = new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })

  return (
    <main className="pt-24 pb-20 min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Profile header ── */}
        <div className="glass-card p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saffron/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-saffron/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-saffron to-saffron-dark flex items-center justify-center text-white font-display font-bold text-3xl shadow-lg flex-shrink-0">
              {initials}
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h1 className="font-display text-2xl font-bold text-white">
                  {profile?.full_name || 'Your Profile'}
                </h1>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border self-center sm:self-auto ${
                  profile?.role === 'mentor'
                    ? 'bg-saffron/15 border-saffron/30 text-saffron'
                    : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                }`}>
                  {profile?.role === 'mentor' ? '🌟 Mentor' : '🎓 Student'}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <p className="text-gray-600 text-xs mt-1">Member since {joinDate}</p>

              {/* Quick stats */}
              {profile && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
                  {[
                    profile.stream && { label: 'Stream', value: profile.stream },
                    profile.marks  && { label: 'Marks',  value: `${profile.marks}%` },
                    profile.state  && { label: 'State',  value: profile.state },
                  ].filter(Boolean).map((item) => (
                    <div key={item.label} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-center">
                      <div className="text-white text-sm font-semibold">{item.value}</div>
                      <div className="text-gray-500 text-[10px]">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link
              to={profile?.class_level === 'class10' ? '/class10/onboarding' : '/class12/onboarding'}
              className="btn-outline text-xs py-2 px-4 self-start"
            >
              Update Profile
            </Link>
          </div>
        </div>

        {/* ── Guidance results ── */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold text-white">Career Guidance</h2>
            <Link to={profile?.class_level === 'class10' ? '/class10/result' : '/class12/result'} className="text-saffron text-xs font-semibold hover:underline">
              View Full Report →
            </Link>
          </div>

          {dataLoading ? (
            <div className="space-y-3">
              {[1, 2].map(n => <div key={n} className="h-16 skeleton rounded-xl" />)}
            </div>
          ) : guidance ? (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-saffron/50 pl-4">
                {guidance.summary}
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {(guidance.options || []).map((opt, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="font-semibold text-white text-sm mb-1">{opt.path}</div>
                    <div className="text-gray-400 text-xs leading-relaxed line-clamp-2">{opt.honest_take}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🧭</div>
              <p className="text-gray-400 text-sm mb-4">No guidance report yet.</p>
              <Link to="/onboarding" className="btn-primary text-sm py-2.5 px-6">
                Get Your Guide
              </Link>
            </div>
          )}
        </div>

        {/* ── Roadmaps ── */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold text-white">Your Roadmaps</h2>
            {roadmaps.length > 0 && (
              <Link to={profile?.class_level === 'class10' ? '/class10/roadmap' : '/class12/roadmap'} className="text-saffron text-xs font-semibold hover:underline">
                View Full Roadmap →
              </Link>
            )}
          </div>

          {dataLoading ? (
            <div className="h-20 skeleton rounded-xl" />
          ) : roadmaps.length > 0 ? (
            <div className="space-y-3">
              {roadmaps.map((rm) => (
                <div key={rm.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
                  <div>
                    <div className="font-semibold text-white text-sm">{rm.career_path}</div>
                    <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{rm.overview}</div>
                  </div>
                  <Link
                    to={profile?.class_level === 'class10' ? '/class10/roadmap' : '/class12/roadmap'}
                    state={{ roadmap: rm }}
                    className="text-saffron text-xs font-semibold hover:underline ml-3 flex-shrink-0"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-gray-400 text-sm mb-4">No roadmaps generated yet. Get your guidance first!</p>
              <Link to={profile?.class_level === 'class10' ? '/class10/result' : '/class12/result'} className="btn-outline text-sm py-2.5 px-6">
                Go to Results
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
