import { useState, useEffect } from 'react'

const CONSENT_KEY = 'aageKyaConsentGiven'

export function useConsent() {
  const [consentGiven, setConsentGiven] = useState(() => {
    return localStorage.getItem(CONSENT_KEY) === 'true'
  })

  const giveConsent = () => {
    localStorage.setItem(CONSENT_KEY, 'true')
    setConsentGiven(true)
  }

  return { consentGiven, giveConsent }
}

export default function PrivacyConsentModal({ onConsent }) {
  const [checked, setChecked] = useState(false)
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleAgree = () => {
    if (!checked) return
    localStorage.setItem(CONSENT_KEY, 'true')
    onConsent?.()
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="max-w-lg w-full rounded-3xl border border-white/10 shadow-2xl transition-all duration-500"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #0a0f1e 100%)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-saffron/15 border border-saffron/30 flex items-center justify-center text-xl">
              🔐
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white leading-tight">
                Before We Continue
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">Privacy &amp; Data Consent — Aage Kya?</p>
            </div>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed mb-5">
            To give you personalised career guidance, we collect and store some academic information about you. Here's exactly what we do and don't do:
          </p>

          {/* What we collect */}
          <div className="space-y-2 mb-5">
            {[
              { icon: '📋', label: 'Academic details', desc: 'Board, marks, stream, state — used only to generate your guidance' },
              { icon: '💼', label: 'Academic wallet', desc: 'Skills, projects, internships — you add these yourself' },
              { icon: '🎯', label: 'Guidance history', desc: 'Your saved reports, roadmaps, and goal progress' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 bg-white/4 border border-white/8 rounded-xl p-3">
                <span className="text-base shrink-0">{icon}</span>
                <div>
                  <span className="text-white text-xs font-semibold block">{label}</span>
                  <span className="text-gray-400 text-xs leading-snug">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* What we never store */}
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4 mb-5">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">We never store</p>
            <ul className="space-y-1">
              {[
                'Aadhaar number or APAAR ID',
                'Bank details or financial account info',
                'Passwords (handled by Supabase Auth, not us)',
                'Your data is never sold to third parties',
              ].map(item => (
                <li key={item} className="text-gray-300 text-xs flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group mb-6">
            <div
              onClick={() => setChecked(!checked)}
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                ${checked
                  ? 'bg-saffron border-saffron'
                  : 'border-white/20 group-hover:border-white/40'
                }`}
            >
              {checked && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-gray-300 text-sm leading-snug select-none" onClick={() => setChecked(!checked)}>
              I understand and agree that Aage Kya? will store my academic profile information as described above to provide personalised guidance.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <button
            onClick={handleAgree}
            disabled={!checked}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2
              ${checked
                ? 'btn-primary shadow-lg shadow-saffron/20 hover:scale-[1.02]'
                : 'bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed'
              }`}
          >
            <span>I Agree &amp; Continue</span>
            {checked && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          <p className="text-center text-gray-600 text-xs mt-3">
            This consent is required to use Aage Kya? guidance features.
          </p>
        </div>
      </div>
    </div>
  )
}
