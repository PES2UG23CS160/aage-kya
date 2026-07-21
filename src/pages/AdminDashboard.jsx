import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AdminDashboard() {
  const { session, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('analytics') // 'analytics' | 'mentors' | 'feedback' | 'users'
  const [analytics, setAnalytics] = useState(null)
  const [applications, setApplications] = useState([])
  const [feedback, setFeedback] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // Double check client side role protection
  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const fetchAllData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      }

      const analyticsRes = await fetch('/api/analytics', { headers })
      const analyticsData = await analyticsRes.json()

      const appsRes = await fetch('/api/admin/mentor-applications', { headers })
      const appsData = await appsRes.json()

      const feedbackRes = await fetch('/api/admin/course-feedback', { headers })
      const feedbackData = await feedbackRes.json()

      // Fetch users from Supabase directly
      const { data: usersData } = await supabase.from('students').select('id, full_name, role, class_level, created_at, marks, stream, state').order('created_at', { ascending: false }).limit(100)

      setAnalytics(analyticsData)
      setApplications(appsData.applications || [])
      setFeedback(feedbackData.feedback || [])
      setUsers(usersData || [])
    } catch (err) {
      console.error('Error fetching admin data:', err)
      setErrorMsg('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [session])

  // ── Actions ──────────────────────────────────────────────────
  const handleApproveMentor = async (id) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/mentor-applications/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to approve')
      // Refresh
      await fetchAllData()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectMentor = async (id) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/mentor-applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to reject')
      await fetchAllData()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleApproveFeedback = async (id) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/course-feedback/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to approve feedback')
      await fetchAllData()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteFeedback = async (id) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/course-feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to delete feedback')
      await fetchAllData()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const pendingMentors = applications.filter(a => a.status === 'pending')
  const pendingFeedback = feedback.filter(f => !f.approved)

  // ── Render Charts ────────────────────────────────────────────
  const renderStreamChart = () => {
    if (!analytics || !analytics.by_stream || analytics.by_stream.length === 0) {
      return <div className="text-gray-400 text-sm py-8 text-center">No stream data available</div>
    }

    const maxCount = Math.max(...analytics.by_stream.map(s => s.count))
    const chartHeight = 160
    const barWidth = 60
    const gap = 24
    const paddingLeft = 40
    const chartWidth = analytics.by_stream.length * (barWidth + gap) + paddingLeft

    return (
      <div className="overflow-x-auto pb-4">
        <svg width={chartWidth} height={chartHeight + 40} className="mx-auto overflow-visible">
          {analytics.by_stream.map((item, idx) => {
            const barHeight = (item.count / maxCount) * chartHeight
            const x = paddingLeft + idx * (barWidth + gap)
            const y = chartHeight - barHeight + 20

            return (
              <g key={idx} className="group">
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  fill="url(#saffronGradient)"
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                />
                {/* Tooltip value */}
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  {item.count}
                </text>
                {/* Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 35}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="10"
                  className="font-medium"
                >
                  {item.stream.length > 8 ? item.stream.slice(0, 8) + '..' : item.stream}
                </text>
              </g>
            )
          })}
          {/* Gradients */}
          <defs>
            <linearGradient id="saffronGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Banner/Header */}
        <div className="relative rounded-3xl overflow-hidden mb-8 border border-white/10 bg-gradient-to-r from-saffron/15 via-[#111827] to-[#111827] p-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-saffron/40 to-transparent" />
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Admin Control Panel</h1>
          <p className="mt-2 text-gray-400 max-w-2xl text-sm leading-relaxed">
            Monitor platform metrics, approve student mentor applications, and moderate submitted course feedback.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-rose-300 text-sm mb-6 flex items-center gap-3">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="glass-card border-white/5 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl text-indigo-400">
              👥
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Students</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{analytics?.total_students ?? 0}</h3>
            </div>
          </div>

          <div className="glass-card border-white/5 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-saffron/10 border border-saffron/20 flex items-center justify-center text-2xl text-saffron">
              🌟
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Mentors</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{applications.filter(a => a.status === 'approved').length}</h3>
            </div>
          </div>

          <div className="glass-card border-white/5 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl text-amber-400">
              ⏳
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Mentors</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{pendingMentors.length}</h3>
            </div>
          </div>

          <div className="glass-card border-white/5 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl text-emerald-400">
              💬
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Feedback</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{pendingFeedback.length}</h3>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'analytics', label: '📊 Analytics' },
            { id: 'mentors', label: `🌟 Mentors (${pendingMentors.length})` },
            { id: 'feedback', label: `💬 Feedback (${pendingFeedback.length})` },
            { id: 'users', label: `👥 Users (${users.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                activeTab === t.id
                  ? 'bg-saffron text-white border-saffron shadow-lg shadow-saffron/20'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-saffron mb-4" />
            <p className="text-gray-400 text-sm">Fetching database updates...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Tab: Analytics ── */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Stream Distribution */}
                <div className="glass-card border-white/5 p-6 relative overflow-hidden">
                  <h3 className="font-display text-lg font-bold text-white mb-6">Student Distribution by Stream</h3>
                  {renderStreamChart()}
                </div>

                {/* State Distribution */}
                <div className="glass-card border-white/5 p-6">
                  <h3 className="font-display text-lg font-bold text-white mb-6">Student Distribution by State</h3>
                  {(!analytics || !analytics.by_state || analytics.by_state.length === 0) ? (
                    <div className="text-gray-400 text-sm py-8 text-center">No state data available</div>
                  ) : (
                    <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                      {analytics.by_state.map((item, idx) => {
                        const pct = Math.round((item.count / (analytics.total_students || 1)) * 100)
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-300 font-semibold">{item.state || 'Unknown'}</span>
                              <span className="text-saffron font-bold">{item.count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-saffron to-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Mentors ── */}
            {activeTab === 'mentors' && (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold text-white mb-2">Pending Mentor Applications</h3>
                {pendingMentors.length === 0 ? (
                  <div className="glass-card border-white/5 p-12 text-center text-gray-400 text-sm">
                    ✨ No pending mentor applications. All caught up!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingMentors.map((app) => (
                      <div key={app.id} className="glass-card border-white/5 p-6 relative flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-display text-base font-bold text-white">{app.name}</h4>
                              <p className="text-xs text-gray-400">{app.email}</p>
                            </div>
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Pending
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs mb-4 p-3 bg-white/5 rounded-xl border border-white/5">
                            <div>
                              <span className="text-gray-400">College:</span>
                              <p className="text-white font-medium truncate mt-0.5">{app.college}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Degree:</span>
                              <p className="text-white font-medium truncate mt-0.5">{app.degree}</p>
                            </div>
                          </div>

                          <div className="text-xs text-gray-300 leading-relaxed mb-6">
                            <span className="text-gray-400 block font-semibold mb-1">Background Story / Motivation:</span>
                            "{app.story}"
                          </div>
                        </div>

                        <div className="flex gap-3 border-t border-white/5 pt-4">
                          <button
                            onClick={() => handleApproveMentor(app.id)}
                            disabled={actionLoading === app.id}
                            className="flex-1 btn-primary py-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-white disabled:opacity-50"
                          >
                            {actionLoading === app.id ? 'Processing...' : '✅ Approve'}
                          </button>
                          <button
                            onClick={() => handleRejectMentor(app.id)}
                            disabled={actionLoading === app.id}
                            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-300 transition-all text-center disabled:opacity-50"
                          >
                            {actionLoading === app.id ? 'Processing...' : '❌ Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Feedback ── */}
            {activeTab === 'feedback' && (
              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold text-white mb-2">Pending Course Feedback</h3>
                {pendingFeedback.length === 0 ? (
                  <div className="glass-card border-white/5 p-12 text-center text-gray-400 text-sm">
                    ✨ No pending course feedback entries to moderate.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingFeedback.map((fb) => (
                      <div key={fb.id} className="glass-card border-white/5 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-saffron/10 text-saffron border border-saffron/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {fb.stream_key}
                            </span>
                            <span className="text-gray-500 text-xs">
                              Author: {fb.author_id ? fb.author_id.slice(0, 8) + '...' : 'Anonymous'}
                            </span>
                            <span className="text-gray-500 text-[10px]">
                              {new Date(fb.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">"{fb.content}"</p>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                          <button
                            onClick={() => handleApproveFeedback(fb.id)}
                            disabled={actionLoading === fb.id}
                            className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDeleteFeedback(fb.id)}
                            disabled={actionLoading === fb.id}
                            className="flex-1 md:flex-none px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Users ── */}
            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className="font-display text-lg font-bold text-white">All Registered Users</h3>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by name, state, stream..."
                    className="search-input max-w-xs text-sm py-2"
                  />
                </div>
                <div className="glass-card border-white/5 overflow-hidden rounded-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                          <th className="text-left px-5 py-3">Name</th>
                          <th className="text-left px-5 py-3">Role</th>
                          <th className="text-left px-5 py-3">Class Level</th>
                          <th className="text-left px-5 py-3">Stream</th>
                          <th className="text-left px-5 py-3">Marks</th>
                          <th className="text-left px-5 py-3">State</th>
                          <th className="text-left px-5 py-3">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users
                          .filter(u => {
                            const q = userSearch.toLowerCase()
                            return !q || (u.full_name || '').toLowerCase().includes(q)
                              || (u.state || '').toLowerCase().includes(q)
                              || (u.stream || '').toLowerCase().includes(q)
                              || (u.role || '').toLowerCase().includes(q)
                          })
                          .map(u => (
                            <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="px-5 py-3 text-white font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-saffron/15 border border-saffron/20 flex items-center justify-center text-xs font-bold text-saffron flex-shrink-0">
                                    {(u.full_name || '?')[0].toUpperCase()}
                                  </div>
                                  {u.full_name || <span className="text-gray-600 italic">Unnamed</span>}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  u.role === 'admin' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                  : u.role === 'mentor' ? 'bg-saffron/10 border-saffron/20 text-saffron'
                                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}>{u.role || 'student'}</span>
                              </td>
                              <td className="px-5 py-3 text-gray-400">{u.class_level || '—'}</td>
                              <td className="px-5 py-3 text-gray-400 text-xs">{u.stream || '—'}</td>
                              <td className="px-5 py-3 text-gray-400">{u.marks ? `${u.marks}%` : '—'}</td>
                              <td className="px-5 py-3 text-gray-400 text-xs">{u.state || '—'}</td>
                              <td className="px-5 py-3 text-gray-500 text-xs">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {users.filter(u => {
                      const q = userSearch.toLowerCase()
                      return !q || (u.full_name || '').toLowerCase().includes(q)
                        || (u.state || '').toLowerCase().includes(q)
                        || (u.stream || '').toLowerCase().includes(q)
                    }).length === 0 && (
                      <div className="py-10 text-center text-gray-500 text-sm">No users found</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
