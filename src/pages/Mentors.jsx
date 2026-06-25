import { Link } from 'react-router-dom'

// ─── Data ─────────────────────────────────────────────────────────────────────

const MENTORS = [
  {
    id: 1,
    name: 'Rahul S.',
    initials: 'RS',
    college: 'PES University',
    degree: 'B.E. Electronics & Communication',
    stream: 'PCB → ECE',
    city: 'Bengaluru',
    calLink: '#',
    story:
      'I missed NEET by 8 marks. Ended up in ECE. Here\'s what I wish someone told me.',
    tags: ['NEET dropout', 'Bio to Engineering', 'Career pivot'],
    gradient: 'from-blue-500/30 to-blue-600/10',
    border: 'border-blue-500/25',
    tag_color: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    initials_bg: 'bg-blue-500/20 text-blue-300',
    available: true,
  },
  {
    id: 2,
    name: 'Priya M.',
    initials: 'PM',
    college: 'NIT Surathkal',
    degree: 'B.Tech Computer Science',
    stream: 'PCM → CSE',
    city: 'Mangaluru',
    calLink: '#',
    story:
      'First in my family to leave home for college. It was terrifying. I\'ll tell you exactly what helped.',
    tags: ['First-gen student', 'Hostel life', 'Scholarships'],
    gradient: 'from-purple-500/30 to-purple-600/10',
    border: 'border-purple-500/25',
    tag_color: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    initials_bg: 'bg-purple-500/20 text-purple-300',
    available: true,
  },
  {
    id: 3,
    name: 'Arjun K.',
    initials: 'AK',
    college: 'Manipal University',
    degree: 'BBA + Certification Finance',
    stream: 'Commerce',
    city: 'Pune',
    calLink: '#',
    story:
      'Family wanted CA. I wanted something else. Here\'s how I navigated that conversation.',
    tags: ['Family pressure', 'Commerce', 'Non-CA path'],
    gradient: 'from-emerald-500/30 to-emerald-600/10',
    border: 'border-emerald-500/25',
    tag_color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    initials_bg: 'bg-emerald-500/20 text-emerald-300',
    available: true,
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MentorCard({ mentor, index }) {
  return (
    <div
      className={`glass-card flex flex-col hover:scale-[1.02] transition-all duration-300 overflow-hidden group animate-slide-up`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Top gradient strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${mentor.gradient} opacity-80`} />

      <div className="p-6 sm:p-8 flex flex-col gap-5 flex-1">

        {/* Avatar + name row */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${mentor.initials_bg} border ${mentor.border} flex items-center justify-center font-display font-bold text-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
            {mentor.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-white text-lg leading-tight">
                  {mentor.name}
                </h3>
                <p className="text-gray-400 text-sm mt-0.5 leading-snug">{mentor.degree}</p>
                <p className="text-saffron text-xs font-semibold mt-0.5">{mentor.college}</p>
              </div>
              {/* Available badge */}
              <span className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 text-xs text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Free
              </span>
            </div>
          </div>
        </div>

        {/* Meta: city + stream */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-gray-400 text-xs">
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {mentor.city}
          </span>
          <span className="text-gray-700">·</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${mentor.tag_color}`}>
            {mentor.stream}
          </span>
        </div>

        {/* Story quote — main content */}
        <blockquote className="flex-1 relative">
          {/* Large decorative quote mark */}
          <span
            className="absolute -top-3 -left-1 text-5xl text-saffron/20 font-serif leading-none select-none pointer-events-none"
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <p className="text-gray-200 text-base leading-relaxed pl-4 font-medium italic relative z-10">
            {mentor.story}
          </p>
        </blockquote>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {mentor.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-navy-800 border border-white/8 text-gray-400 px-2.5 py-1 rounded-lg"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/6" />

        {/* CTA */}
        <a
          href={mentor.calLink}
          className="btn-primary text-sm py-3 text-center flex items-center justify-center gap-2 group/btn"
        >
          <span>Book Free 20-min Call</span>
          <svg
            className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>

        <p className="text-center text-gray-600 text-xs">No sign-up needed · 20 minutes · Completely free</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Mentors() {
  return (
    <main className="pt-24 pb-24 min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Talk to someone who{' '}
            <span className="gradient-text">actually gets it</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Not a counsellor. Not a coaching centre. Real students who were in your exact shoes — and figured it out.
          </p>
        </div>

        {/* ── Trust banner ── */}
        <div className="flex items-start sm:items-center gap-3 bg-saffron/8 border border-saffron/20 rounded-2xl px-5 py-4 mb-12 max-w-2xl mx-auto animate-fade-in">
          <span className="text-2xl flex-shrink-0 mt-0.5 sm:mt-0">🤝</span>
          <div>
            <p className="text-saffron font-semibold text-sm">
              All mentors volunteer their time. No spam, no sales.
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              Every mentor on this page chose to be here because someone helped them once.
            </p>
          </div>
        </div>

        {/* ── Cards grid ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {MENTORS.map((mentor, i) => (
            <MentorCard key={mentor.id} mentor={mentor} index={i} />
          ))}
        </div>

        {/* ── What to expect ── */}
        <div className="glass-card p-8 sm:p-10 mb-12 max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-7 text-center">
            What happens on the call?
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '🗣️', step: '1', title: 'You talk', desc: 'Tell them your situation — marks, stream, what you\'re confused about. No judgment.' },
              { icon: '💬', step: '2', title: 'They share', desc: 'They\'ll tell you what they actually did, what worked, and what they\'d do differently.' },
              { icon: '📋', step: '3', title: 'You leave with clarity', desc: 'Not a plan handed to you — but enough real info to make a better decision yourself.' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-saffron/10 border border-saffron/20 flex items-center justify-center text-2xl mx-auto mb-3">
                  {icon}
                </div>
                <p className="text-saffron text-xs font-bold uppercase tracking-wider mb-1">Step {step}</p>
                <h3 className="font-display font-bold text-white text-base mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Become a mentor CTA ── */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">
            Were you in their position once? Help the next student.
          </p>
          <button className="btn-outline text-sm px-8 py-3">
            Volunteer as a Mentor →
          </button>
        </div>
      </div>
    </main>
  )
}
