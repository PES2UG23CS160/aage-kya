import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setErrorMsg('')
    setSuccess(false)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin, // Redirects back to the current site
        },
      })

      if (error) throw error

      setSuccess(true)
      if (onAuthSuccess) {
        onAuthSuccess(email)
      }
    } catch (err) {
      console.error('Auth Error:', err.message)
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="glass-card w-full max-w-md p-6 sm:p-8 border-saffron/30 relative animate-slide-up shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl"
          aria-label="Close modal"
        >
          &times;
        </button>

        {!success ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-saffron/10 border border-saffron/30 flex items-center justify-center text-2xl mx-auto mb-3">
                ✨
              </div>
              <h2 className="font-display text-2xl font-bold text-white">Save Your Progress</h2>
              <p className="text-gray-400 text-sm mt-1">
                Enter your email to unlock your 4-year roadmap and save your career guidance results.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 text-rose-300 text-xs leading-relaxed">
                ⚠️ {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. aditya@gmail.com"
                className="w-full bg-navy-800 border border-white/10 hover:border-white/20 focus:border-saffron/60 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-saffron/40"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sending Link...</span>
                </>
              ) : (
                <span>Send Magic Link →</span>
              )}
            </button>

            <p className="text-center text-gray-500 text-[10px] leading-relaxed">
              We will email you a login link. Clicking it logs you in instantly without a password.
            </p>
          </form>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
              ✉️
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Check Your Email!</h2>
            <p className="text-gray-300 text-sm leading-relaxed max-w-xs mx-auto mb-6">
              We have sent a login link to <span className="text-saffron font-semibold">{email}</span>. Click the link in your inbox to complete sign in.
            </p>
            <button
              onClick={onClose}
              className="btn-primary px-8 py-3 text-sm"
            >
              Okay
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
