import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/6 bg-navy-800/40 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Main row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">

          {/* Brand + tagline */}
          <div className="text-center sm:text-left">
            <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
              <div className="w-7 h-7 rounded-lg bg-saffron flex items-center justify-center text-white font-bold text-xs font-display group-hover:scale-110 transition-transform">
                AK
              </div>
              <span className="font-display font-bold text-lg text-saffron group-hover:text-saffron-light transition-colors">
                Aage Kya?
              </span>
            </Link>
            {/* The tagline the user asked for */}
            <p className="text-gray-400 text-sm font-medium max-w-xs leading-relaxed">
              Built for students India forgot to guide.
            </p>
          </div>

          {/* Nav links */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm">
            {[
              { to: '/', label: 'Home' },
              { to: '/onboarding', label: 'Get Started' },
              { to: '/mentors', label: 'Mentors' },
              { to: '/result', label: 'My Result' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-gray-500 hover:text-saffron transition-colors duration-200 font-medium"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 my-7" />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>
            Guidance powered by{' '}
            <span className="text-gray-500 font-medium">Gemini AI</span>
            {' '}· Always verify info directly with colleges.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Free to use · No login
            </span>
            <span>🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
