import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const features = [
  {
    icon: '💥',
    title: 'Brutally Honest Options',
    desc: 'No sugar-coating. We tell you exactly which streams, colleges, and careers actually match your marks, budget, and reality — not just what sounds good.',
    tag: 'No fluff',
    tagColor: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  },
  {
    icon: '💰',
    title: 'Real College Costs',
    desc: "Fees, hostel, books, living expenses — the full picture. Know exactly what you're signing up for before you sign anything.",
    tag: 'Transparent',
    tagColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  },
  {
    icon: '🤝',
    title: 'Talk to a Mentor Free',
    desc: 'Book a free 30-min call with someone who was in your exact shoes — same board results, same confusion, now doing well. Ask them anything.',
    tag: 'No cost',
    tagColor: 'text-saffron bg-saffron/10 border-saffron/20',
  },
]

const stats = [
  { value: '40K+', label: 'Students Helped' },
  { value: '₹0', label: 'Cost to Start' },
  { value: '300+', label: 'Verified Mentors' },
  { value: '12th', label: 'Pass? You Qualify' },
]

// Simple animated counter hook
function useCounter(target, duration = 1500, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    const numeric = parseInt(target.replace(/\D/g, ''), 10)
    if (!numeric) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * numeric))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

function StatCard({ value, label, index }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const numeric = parseInt(value.replace(/\D/g, ''), 10)
  const count = useCounter(value, 1200, visible)
  const prefix = value.startsWith('₹') ? '₹' : ''
  const suffix = value.endsWith('+') ? '+' : value.endsWith('%') ? '%' : ''
  const displayValue = numeric ? `${prefix}${count}${suffix}` : value

  return (
    <div
      ref={ref}
      className="text-center"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="font-display text-3xl md:text-4xl font-bold gradient-text">{displayValue}</div>
      <div className="text-gray-400 text-sm mt-1 font-medium">{label}</div>
    </div>
  )
}

export default function Landing() {
  return (
    <main className="pt-16 overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-saffron/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] bg-saffron/8 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-900/20 rounded-full blur-[80px]" />
        </div>

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Saffron top-border accent line */}
        <div className="absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saffron/40 to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2.5 bg-saffron/10 border border-saffron/30 rounded-full px-5 py-2 mb-10 animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-saffron" />
            </span>
            <span className="text-saffron text-sm font-semibold tracking-wide">
              Free for Class 12 students &amp; graduates
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-display font-bold leading-[1.1] mb-6 animate-slide-up text-balance"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}
          >
            Board results are out.{' '}
            <span className="relative inline-block">
              <span className="gradient-text">Now what?</span>
              {/* Underline squiggle */}
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="6" viewBox="0 0 200 6" preserveAspectRatio="none"
                fill="none" xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 3 Q25 0 50 3 Q75 6 100 3 Q125 0 150 3 Q175 6 200 3"
                  stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up"
            style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', animationDelay: '100ms' }}
          >
            Honest, personalized guidance for students who have{' '}
            <span className="text-white font-semibold">no one to ask</span>.
            <br className="hidden sm:block" />
            No coaching class pitch. No sponsored rankings. Just the truth.
          </p>

          {/* CTA group */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up"
            style={{ animationDelay: '200ms' }}
          >
            <Link
              to="/onboarding"
              id="hero-cta"
              className="btn-primary text-base px-8 py-4 animate-pulse-glow font-semibold tracking-wide"
            >
              Get Your Honest Guide →
            </Link>
            <Link to="/mentors" className="btn-outline text-base px-8 py-4 font-semibold">
              Talk to a Mentor Free
            </Link>
          </div>

          {/* Trust micro-copy */}
          <p className="text-gray-500 text-xs mb-20 animate-fade-in" style={{ animationDelay: '300ms' }}>
            🔒 No login required &nbsp;·&nbsp; ✅ No spam &nbsp;·&nbsp; 🇮🇳 Built for Indian students
          </p>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto border-t border-white/5 pt-10"
          >
            {stats.map((s, i) => (
              <StatCard key={s.label} value={s.value} label={s.label} index={i} />
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent pointer-events-none" />
      </section>

      {/* ── CONTEXT STRIP ── */}
      <section className="py-10 border-y border-white/5 bg-navy-800/40">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-x-12 gap-y-4 text-sm text-gray-400 text-center">
          {[
            '🎓 PCM / PCB / Commerce / Arts — all streams covered',
            '🏫 Government & private college options',
            '💸 Scholarships you actually qualify for',
            '🗺️ Tier 2 & 3 city friendly advice',
          ].map((item) => (
            <span key={item} className="flex items-center gap-2 font-medium">
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              What you actually get
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Not vague advice. Not a newsletter. Real, actionable guidance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="glass-card p-8 group hover:scale-[1.02] hover:border-saffron/40 transition-all duration-300 cursor-default flex flex-col gap-5"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Icon + tag row */}
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-navy-800 border border-white/10 flex items-center justify-center text-3xl group-hover:border-saffron/30 transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${feature.tagColor}`}>
                    {feature.tag}
                  </span>
                </div>

                {/* Text */}
                <div>
                  <h3 className="font-display font-bold text-xl text-white mb-3 group-hover:text-saffron transition-colors duration-200">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {feature.desc}
                  </p>
                </div>

                {/* Bottom arrow hint */}
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                  <Link
                    to="/onboarding"
                    className="text-saffron text-sm font-semibold hover:underline underline-offset-2 transition-all"
                  >
                    {i === 2 ? 'Book Free Call →' : 'Learn More →'}
                  </Link>
                  <div className="w-7 h-7 rounded-full bg-saffron/10 group-hover:bg-saffron/20 flex items-center justify-center transition-colors">
                    <svg className="w-3.5 h-3.5 text-saffron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF QUOTE ── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card p-10 text-center relative overflow-hidden border-saffron/20">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saffron/50 to-transparent" />
            <div className="text-5xl mb-4">&ldquo;</div>
            <blockquote className="text-gray-200 text-lg md:text-xl leading-relaxed mb-6 font-medium">
              I had 72% in boards and didn&apos;t know what to do. My parents wanted engineering,
              but I had no idea what branch or college. Aage Kya showed me options I never knew existed.
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-saffron/20 border border-saffron/30 flex items-center justify-center text-lg">
                👩‍🎓
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-sm">Divya R.</div>
                <div className="text-gray-500 text-xs">Nagpur, Maharashtra · Now at VNIT</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-saffron/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-saffron/40 to-transparent" />

            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Stop guessing.{' '}
              <span className="gradient-text">Start knowing.</span>
            </h2>
            <p className="text-gray-400 mb-8 text-base md:text-lg max-w-xl mx-auto">
              Takes 3 minutes. Completely free. No login needed.
              Get a guide that&apos;s actually written for <em>your</em> situation.
            </p>

            <Link
              to="/onboarding"
              id="footer-cta"
              className="btn-primary text-base px-10 py-4 inline-block"
            >
              Get Your Honest Guide →
            </Link>

            <p className="text-gray-600 text-xs mt-6">
              Already used by 40,000+ students across India
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
