import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null) // students row

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id, session.user)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, sessionUser) {
    let { data } = await supabase
      .from('students')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!data && sessionUser) {
      const userType = sessionUser.user_metadata?.user_type || 'class12'
      let role = 'student'
      let class_level = 'class12'
      if (userType === 'class10') {
        role = 'student'
        class_level = 'class10'
      } else if (userType === 'other') {
        role = 'other'
        class_level = 'other'
      } else if (userType === 'admin') {
        role = 'admin'
        class_level = 'other'
      }

      let { data: insertedData, error } = await supabase
        .from('students')
        .insert({
          id: userId,
          role,
          class_level,
          full_name: '',
        })
        .select()
        .maybeSingle()

      if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('class_level'))) {
        const { data: retryData, error: retryError } = await supabase
          .from('students')
          .insert({
            id: userId,
            role,
            full_name: '',
          })
          .select()
          .maybeSingle()
        insertedData = retryData
        error = retryError
      }

      if (!error && insertedData) {
        data = insertedData
      }
    }
    setProfile(data)
  }

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('aageKyaRoadmap')
    localStorage.removeItem('aageKyaResult')
    localStorage.removeItem('aageKyaFormData')
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
