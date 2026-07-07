import { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import AuthModal from './AuthModal'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/onboarding', label: 'Get Started' },
  { to: '/mentors', label: 'Mentors' },
  { to: '/result', label: 'My Result' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('aageKyaRoadmap') // Clear roadmap cache on logout
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-navy/80 backdrop-blur-md border-b border-white/5 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-saffron flex items-center justify-center text-white font-bold text-sm font-display group-hover:scale-110 transition-transform duration-200">
                AK
              </div>
              <span className="font-display font-bold text-xl text-saffron group-hover:text-saffron-light transition-colors duration-200">
                Aage Kya?
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'text-saffron font-semibold' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Action buttons (Sign In / Logout) */}
            <div className="hidden md:flex items-center gap-4">
              {session ? (
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-xs truncate max-w-[120px]" title={session.user.email}>
                    {session.user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="btn-outline text-xs py-2 px-4 hover:scale-100 active:scale-100"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="btn-primary text-xs py-2 px-5 hover:scale-105 active:scale-95"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {isOpen && (
            <div className="md:hidden pb-4 border-t border-white/5 mt-2 pt-4 space-y-3 animate-fade-in">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block px-2 py-2 rounded-lg nav-link ${isActive ? 'text-saffron bg-saffron/10' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="pt-2 border-t border-white/5 space-y-2">
                {session ? (
                  <>
                    <div className="text-gray-400 text-xs px-2 truncate">
                      {session.user.email}
                    </div>
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        handleSignOut()
                      }}
                      className="w-full btn-outline text-sm py-2 px-4"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      setIsAuthOpen(true)
                    }}
                    className="w-full btn-primary text-sm py-2 px-5"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal Overlay */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </>
  )
}
