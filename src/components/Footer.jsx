import { Link } from 'react-router-dom'

const footerLinks = [
  { to: '/', label: 'Home' },
  { to: '/onboarding', label: 'Get Started' },
  { to: '/mentors', label: 'Mentors' },
  { to: '/result', label: 'My Result' },
]

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-white/[0.06] bg-[#080C18]/80 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Main row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-10">

          {/* Brand */}
          <div className="text-center sm:text-left max-w-xs">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saffron to-saffron-dark flex items-center justify-center text-white font-bold text-xs font-display group-hover:scale-110 transition-transform shadow-md">
                AK
              </div>
              <span className="font-display font-bold text-lg text-white group-hover:text-saffron transition-colors">
                Aage Kya?
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              Built for students India forgot to guide.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center sm:justify-end gap-x-8 gap-y-3 text-sm">
            {footerLinks.map(({ to, label }) => (
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
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>
            © {year} Aage Kya? &nbsp;·&nbsp; Guidance powered by{' '}
            <span className="text-gray-500 font-medium">Groq AI</span>
            &nbsp;·&nbsp; Always verify info directly with colleges.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Free to use · No login required
            </span>
            <span>🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
