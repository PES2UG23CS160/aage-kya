import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

const MIN_PASSWORD_LENGTH = 6

function hasRecoveryCallbackError() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return Boolean(
    query.get('error') ||
    query.get('error_code') ||
    query.get('error_description') ||
    hash.get('error') ||
    hash.get('error_code') ||
    hash.get('error_description')
  )
}

export default function ResetPassword() {
  const { session, loading: authLoading } = useAuth()
  const [status, setStatus] = useState('checking') // checking | ready | saving | success | error
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (authLoading || status !== 'checking') return

    if (hasRecoveryCallbackError() || !session) {
      setErrorMsg('This password reset link is invalid or has expired. Request a new link and try again.')
      setStatus('error')
      return
    }

    setStatus('ready')
  }, [authLoading, session, status])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMsg('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      return setErrorMsg(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    }
    if (password !== confirm) {
      return setErrorMsg('Passwords do not match.')
    }
    if (!session) {
      setStatus('error')
      return setErrorMsg('Your reset session has expired. Request a new password reset link.')
    }

    setStatus('saving')
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message || 'Your password could not be updated. Please request a new reset link.')
      setStatus('ready')
      return
    }

    setPassword('')
    setConfirm('')
    setStatus('success')
  }

  const inputClass = 'w-full bg-[#111827] border border-white/10 hover:border-white/20 focus:border-saffron/60 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm transition-all outline-none focus:ring-2 focus:ring-saffron/30'

  return (
    <main className="pt-24 pb-24 min-h-screen px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md mx-auto py-12">
        <div className="glass-card border-white/10 p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saffron/50 to-transparent" />

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-saffron/10 border border-saffron/30 flex items-center justify-center text-2xl mx-auto mb-3">
              🔑
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Set a new password</h1>
            <p className="text-gray-400 text-sm mt-1">Choose a password you do not use on another site.</p>
          </div>

          <div aria-live="polite">
            {status === 'checking' && (
              <div className="py-8 flex flex-col items-center gap-3 text-gray-400 text-sm">
                <div className="w-8 h-8 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
                Checking your reset link...
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 text-rose-200 text-sm leading-relaxed mb-5">
                  {errorMsg}
                </div>
                <p className="text-gray-500 text-xs mb-5">
                  Return to sign in, choose “Forgot password?”, and request another email.
                </p>
                <Link to="/" className="btn-primary px-8 py-3 text-sm">
                  Return Home
                </Link>
              </div>
            )}

            {(status === 'ready' || status === 'saving') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 text-rose-300 text-xs leading-relaxed">
                    ⚠️ {errorMsg}
                  </div>
                )}
                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold text-gray-300 mb-1.5">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-semibold text-gray-300 mb-1.5">Confirm New Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="Repeat your new password"
                    className={inputClass}
                  />
                </div>
                <button type="submit" disabled={status === 'saving'} className="w-full btn-primary py-3 text-sm disabled:opacity-60">
                  {status === 'saving' ? 'Updating password...' : 'Update Password →'}
                </button>
              </form>
            )}

            {status === 'success' && (
              <div className="text-center py-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl mx-auto mb-4">
                  ✓
                </div>
                <h2 className="font-display text-xl font-bold text-white mb-2">Password updated</h2>
                <p className="text-gray-400 text-sm mb-6">Your new password is ready to use.</p>
                <Link to="/" className="btn-primary px-8 py-3 text-sm">
                  Continue to Aage Kya?
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
