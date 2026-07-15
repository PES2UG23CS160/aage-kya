import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function MentorDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [mentorProfile, setMentorProfile] = useState(null)
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  // ── Guard: redirect non-mentors ─────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate('/')
    if (!authLoading && profile && profile.role !== 'mentor') navigate('/')
  }, [user, profile, authLoading, navigate])

  // ── Load mentor profile and sessions ────────────────────────
  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      // Find the mentor row linked to this user
      const { data: mp } = await supabase
        .from('mentors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      setMentorProfile(mp)

      if (mp) {
        const { data: sess } = await supabase
          .from('chat_sessions')
          .select('*, students!chat_sessions_student_id_fkey(full_name, stream, marks)')
          .eq('mentor_id', mp.id)
          .order('updated_at', { ascending: false })
        setSessions(sess || [])
      }
      setLoading(false)
    }
    load()
  }, [user])

  // ── Load messages for active session ────────────────────────
  const loadMessages = useCallback(async (sessionId) => {
    if (!sessionId) return
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }, [])

  // ── Subscribe to active session messages ─────────────────────
  useEffect(() => {
    if (!activeSession) return
    loadMessages(activeSession.id)

    const channel = supabase
      .channel(`mentor-chat:${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${activeSession.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [activeSession, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    const content = text.trim()
    if (!content || !activeSession || sending) return
    setSending(true)
    setText('')
    const optimistic = { id: `opt-${Date.now()}`, session_id: activeSession.id, sender_id: user.id, content, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, optimistic])
    const { error } = await supabase.from('chat_messages').insert({ session_id: activeSession.id, sender_id: user.id, content })
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setText(content)
    }
    setSending(false)
  }

  if (authLoading || loading) return (
    <main className="pt-24 pb-16 min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
    </main>
  )

  if (!mentorProfile) return (
    <main className="pt-24 pb-16 min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-10 text-center max-w-md">
        <div className="text-4xl mb-4">🔗</div>
        <h2 className="font-display text-xl font-bold text-white mb-3">No mentor profile linked</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Your account isn't linked to a mentor profile yet. Contact an admin to link your <code className="text-saffron text-xs bg-saffron/10 px-1.5 py-0.5 rounded">user_id</code> to your mentor row in the database.
        </p>
      </div>
    </main>
  )

  const studentName = (sess) => sess.students?.full_name || sess.student_id?.slice(0, 8) + '...'

  return (
    <main className="pt-16 min-h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── Sidebar: Session list ── */}
        <aside className="w-72 bg-[#0A0F1E] border-r border-white/8 flex flex-col flex-shrink-0">
          <div className="px-5 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${mentorProfile.initials_bg || 'bg-saffron/20 text-saffron'} flex items-center justify-center font-display font-bold`}>
                {mentorProfile.initials}
              </div>
              <div>
                <div className="font-display font-bold text-white text-sm">{mentorProfile.name}</div>
                <div className="text-emerald-400 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mentor Dashboard
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Student Conversations ({sessions.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="text-3xl mb-3">💬</div>
                <p className="text-gray-400 text-sm">No messages yet.</p>
                <p className="text-gray-600 text-xs mt-1">Students will appear here when they chat with you.</p>
              </div>
            ) : (
              sessions.map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => { setActiveSession(sess); setMessages([]) }}
                  className={`w-full text-left px-4 py-4 border-b border-white/5 transition-all hover:bg-white/5 ${
                    activeSession?.id === sess.id ? 'bg-saffron/10 border-l-2 border-l-saffron' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {studentName(sess)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-sm font-semibold truncate">{studentName(sess)}</div>
                      <div className="text-gray-500 text-xs">
                        {sess.students?.stream && `${sess.students.stream}`}
                        {sess.students?.marks ? ` · ${sess.students.marks}%` : ''}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col bg-[#0D1220]">
          {!activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="text-5xl mb-5">👈</div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Select a conversation</h3>
              <p className="text-gray-400 text-sm">Choose a student from the sidebar to view and reply to their messages.</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8 bg-[#0A0F1E]">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-sm font-bold">
                  {studentName(activeSession)[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-display font-bold text-white text-sm">{studentName(activeSession)}</div>
                  {activeSession.students && (
                    <div className="text-gray-400 text-xs">
                      {activeSession.students.stream}{activeSession.students.marks ? ` · ${activeSession.students.marks}% marks` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`max-w-[72%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-saffron text-white rounded-tr-sm'
                            : 'bg-white/8 border border-white/10 text-gray-200 rounded-tl-sm'
                        } ${msg.id?.toString().startsWith('opt-') ? 'opacity-70' : ''}`}>
                          {msg.content}
                        </div>
                        <span className="text-gray-600 text-[10px] px-1">{formatTime(msg.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/8 px-5 py-4">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reply to student..."
                    className="flex-1 bg-white/5 border border-white/10 hover:border-white/20 focus:border-saffron/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="w-11 h-11 rounded-xl bg-saffron hover:bg-saffron-light disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                    aria-label="Send"
                  >
                    {sending ? (
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
