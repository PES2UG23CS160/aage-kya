import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const SEARCH_ITEMS = [
  // Careers
  { type: 'career', title: 'Software Engineering', desc: 'Build software products & systems', path: '/career-pipeline', icon: '💻' },
  { type: 'career', title: 'Data Science', desc: 'Analyze data & build ML models', path: '/career-pipeline', icon: '📊' },
  { type: 'career', title: 'Medicine (MBBS)', desc: 'Become a doctor', path: '/career-pipeline', icon: '🩺' },
  { type: 'career', title: 'Chartered Accountancy', desc: 'Finance & accounting professional', path: '/career-pipeline', icon: '📋' },
  { type: 'career', title: 'UI/UX Design', desc: 'Design digital experiences', path: '/career-pipeline', icon: '🎨' },
  { type: 'career', title: 'Civil Services (IAS)', desc: 'Government administration', path: '/career-pipeline', icon: '🏛️' },

  // Exams
  { type: 'exam', title: 'JEE Main', desc: 'For NITs, IIITs & GFTIs', path: '/competitive-exams', icon: '⚡' },
  { type: 'exam', title: 'JEE Advanced', desc: 'For IIT admissions', path: '/competitive-exams', icon: '🏆' },
  { type: 'exam', title: 'NEET', desc: 'Medical entrance exam', path: '/competitive-exams', icon: '🩺' },
  { type: 'exam', title: 'KCET', desc: 'Karnataka entrance test', path: '/competitive-exams', icon: '🎯' },
  { type: 'exam', title: 'COMEDK', desc: 'Karnataka private colleges', path: '/competitive-exams', icon: '🎓' },
  { type: 'exam', title: 'CUET', desc: 'Central universities entrance', path: '/competitive-exams', icon: '📚' },

  // Countries
  { type: 'country', title: 'Study in USA', desc: 'Top universities & OPT visa', path: '/study-abroad', icon: '🇺🇸' },
  { type: 'country', title: 'Study in UK', desc: '1-year Master\'s programs', path: '/study-abroad', icon: '🇬🇧' },
  { type: 'country', title: 'Study in Canada', desc: 'PR-friendly pathway', path: '/study-abroad', icon: '🇨🇦' },
  { type: 'country', title: 'Study in Australia', desc: 'Post-study work visa', path: '/study-abroad', icon: '🇦🇺' },
  { type: 'country', title: 'Study in Germany', desc: 'Free tuition at public unis', path: '/study-abroad', icon: '🇩🇪' },

  // Scholarships
  { type: 'scholarship', title: 'Scholarships after 10th', desc: 'NTSE, NMMS & more', path: '/scholarships', icon: '📗' },
  { type: 'scholarship', title: 'Scholarships after 12th', desc: 'CSSS, Pragati & more', path: '/scholarships', icon: '📘' },
  { type: 'scholarship', title: 'Study Abroad Scholarships', desc: 'Fulbright, Chevening, DAAD', path: '/scholarships', icon: '✈️' },

  // Features
  { type: 'feature', title: 'AI Career Guidance', desc: 'Get personalized recommendations', path: '/onboarding', icon: '🧭' },
  { type: 'feature', title: 'Talk to a Mentor', desc: 'Book free mentorship sessions', path: '/mentors', icon: '🤝' },
  { type: 'feature', title: 'Career Pipeline', desc: 'Interactive career roadmap', path: '/career-pipeline', icon: '🗺️' },
  { type: 'feature', title: 'AI Chatbot', desc: 'Ask anything about careers', path: '/chat', icon: '🤖' },
]

const TYPE_COLORS = {
  career: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  exam: 'bg-saffron/10 text-saffron border-saffron/20',
  country: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  scholarship: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  feature: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export default function SearchBar({ isCompact = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const filtered = query.length > 0
    ? SEARCH_ITEMS.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.type.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : SEARCH_ITEMS.slice(0, 6)

  const handleSelect = useCallback((item) => {
    navigate(item.path)
    setIsOpen(false)
    setQuery('')
  }, [navigate])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Keyboard nav within results
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex])
    }
  }

  useEffect(() => { setSelectedIndex(0) }, [query])

  if (isCompact) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-gray-400 text-xs transition-all hover:bg-white/8"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden lg:inline">Search...</span>
        <kbd className="hidden lg:inline text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>
    )
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100) }}
        className="flex items-center gap-2.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-gray-400 text-sm transition-all hover:bg-white/8 w-full max-w-xs"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search careers, colleges, exams...</span>
        <kbd className="ml-auto text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              onClick={() => setIsOpen(false)}
            />

            {/* Search Panel */}
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[201] px-4"
            >
              <div className="bg-[#0D1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                  <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search careers, colleges, exams, scholarships..."
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
                    autoFocus
                  />
                  <kbd className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded font-mono text-gray-500">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto py-2">
                  {filtered.length > 0 ? (
                    filtered.map((item, i) => (
                      <button
                        key={`${item.type}-${item.title}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all ${
                          i === selectedIndex ? 'bg-white/5' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">{item.title}</div>
                          <div className="text-gray-500 text-xs truncate">{item.desc}</div>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TYPE_COLORS[item.type]}`}>
                          {item.type}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-5 py-8 text-center">
                      <p className="text-gray-500 text-sm">No results found for "{query}"</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-white/5 px-5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono">↵</kbd> Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono">Esc</kbd> Close
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-600">Powered by Aage Kya AI</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
