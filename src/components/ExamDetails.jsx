/**
 * ExamDetails.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * After-12th entrance exam detail cards — stream-filtered, fully static.
 * Appears on the Result page for Class 12 students only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'

// ─── Static exam data ─────────────────────────────────────────────────────────

const EXAMS = [
  {
    id: 'jee-main',
    name: 'JEE Main',
    fullName: 'Joint Entrance Examination (Main)',
    emoji: '⚙️',
    color: 'blue',
    streams: ['Science (PCM)', 'Science (PCMB)'],
    eligibility: [
      '75% in Class 12 (65% for SC/ST)',
      'Physics and Mathematics are mandatory',
      'Maximum 3 attempts (2 per year)',
      'Age: no upper limit since 2024',
    ],
    pathsAfter: [
      { path: 'NITs', desc: 'National Institutes of Technology via JOSAA counselling' },
      { path: 'IIITs', desc: 'Indian Institutes of Information Technology' },
      { path: 'GFTIs', desc: 'Government Funded Technical Institutions' },
      { path: 'State CETs', desc: 'Many states use JEE Main rank for engineering admission' },
    ],
    careerLink: 'B.Tech in CSE, ECE, Mechanical, Civil → Software, Core Engineering, PSUs, MBA',
    conductedBy: 'National Testing Agency (NTA)',
    frequency: 'Twice a year (Jan & Apr)',
    examPattern: 'MCQ + Numerical | 75 questions | 300 marks | 3 hours',
    difficulty: 'High',
    tip: 'JEE Main is a gateway exam. A decent rank (under 1.5L) gets you into good NITs. Start preparation at least 18 months before.',
  },
  {
    id: 'jee-advanced',
    name: 'JEE Advanced',
    fullName: 'Joint Entrance Examination (Advanced)',
    emoji: '🏆',
    color: 'violet',
    streams: ['Science (PCM)', 'Science (PCMB)'],
    eligibility: [
      'Must qualify JEE Main (top ~2.5 lakh ranks)',
      'Maximum 2 attempts in consecutive years',
      '75% in Class 12 (65% SC/ST) — same as JEE Main',
      'Maximum age: 25 years (30 for PwD)',
    ],
    pathsAfter: [
      { path: 'IITs', desc: '23 IITs across India — India\'s most prestigious engineering institutes' },
      { path: 'IISc', desc: 'Indian Institute of Science (for BS programs)' },
    ],
    careerLink: 'IIT B.Tech / BS → Top-tier placements, MS/PhD abroad, research, startups',
    conductedBy: 'One of the IITs (rotates annually)',
    frequency: 'Once a year (May/Jun)',
    examPattern: 'Multiple rounds of MCQ, Integer, Match | ~180 marks | 3+3 hours',
    difficulty: 'Extremely High',
    tip: 'Only ~2.5 lakh students appear. Focus on deep concept clarity, not speed. Coaching from Class 11 is strongly recommended.',
  },
  {
    id: 'neet',
    name: 'NEET-UG',
    fullName: 'National Eligibility cum Entrance Test (UG)',
    emoji: '🩺',
    color: 'rose',
    streams: ['Science (PCB)', 'Science (PCMB)'],
    eligibility: [
      '50% aggregate in PCB in Class 12 (40% SC/ST/OBC)',
      'Age: 17 to 25 years (30 for SC/ST)',
      'Unlimited attempts (as of 2024)',
      'Physics, Chemistry, Biology mandatory in Class 12',
    ],
    pathsAfter: [
      { path: 'MBBS', desc: 'Bachelor of Medicine and Bachelor of Surgery — state counselling (NEET rank-based)' },
      { path: 'BDS', desc: 'Bachelor of Dental Surgery' },
      { path: 'BAMS / BHMS / BUMS', desc: 'Ayurvedic, Homeopathic, Unani Medicine degrees' },
      { path: 'BSc Nursing', desc: 'Some government nursing colleges use NEET cutoffs' },
      { path: 'AIIMS / JIPMER', desc: 'Top government medical colleges — same NEET exam' },
    ],
    careerLink: 'Medicine, Surgery, Dentistry, Healthcare Management, Biomedical Research',
    conductedBy: 'National Testing Agency (NTA)',
    frequency: 'Once a year (May)',
    examPattern: 'MCQ | 200 questions (180 attempted) | 720 marks | 3 hours 20 min',
    difficulty: 'Extremely High',
    tip: 'Government MBBS seats are very limited. Private seats cost ₹50L–₹1.5 Cr total. Have a backup plan like BSc Nursing, Physiotherapy, or Biotech.',
  },
  {
    id: 'kcet',
    name: 'KCET',
    fullName: 'Karnataka Common Entrance Test',
    emoji: '🎓',
    color: 'amber',
    streams: ['Science (PCM)', 'Science (PCB)', 'Science (PCMB)'],
    eligibility: [
      'Must be a Karnataka domicile student (or eligible quota category)',
      'Pass Class 12 with PCM (for Engineering) or PCB (for Pharmacy/Agriculture/Veterinary)',
      'No age restriction for engineering courses',
      'Note: MBBS/BDS/AYUSH state quota seats require NEET-UG score (KCET exam marks are NOT used for medical)',
    ],
    pathsAfter: [
      { path: 'B.E. / B.Tech', desc: 'Engineering colleges in Karnataka — top government & private colleges at affordable state fees' },
      { path: 'B.Sc (Agri) / B.V.Sc', desc: 'Agricultural Sciences, Veterinary & Allied Health programs via KCET score' },
      { path: 'B.Pharm / Pharm.D', desc: 'Pharmacy and Pharmaceutical Sciences programs via KCET score' },
    ],
    careerLink: 'Engineering, Agriculture, Veterinary, Pharmacy — Karnataka-specific top state colleges',
    conductedBy: 'Karnataka Examinations Authority (KEA)',
    frequency: 'Once a year (April/May)',
    examPattern: 'MCQ | 60 questions per subject (Maths/Physics/Chemistry/Bio) | 60 marks each | 80 min per paper',
    difficulty: 'Moderate to High',
    tip: 'If you are from Karnataka, KCET is one of the best deals in India for Engineering, Agriculture & Pharmacy — top government colleges at very affordable fees (under ₹1L/yr). Note: For MBBS/BDS, appear for NEET-UG.',
  },
  {
    id: 'nata',
    name: 'NATA',
    fullName: 'National Aptitude Test in Architecture',
    emoji: '🏛️',
    color: 'teal',
    streams: ['Science (PCM)', 'Science (PCMB)', 'Arts / Humanities', 'Commerce'],
    eligibility: [
      '50% aggregate in Class 12 with Mathematics',
      'No age restriction',
      'Can attempt multiple times in a year',
      'Mathematics in Class 12 is mandatory',
    ],
    pathsAfter: [
      { path: 'B.Arch (5 years)', desc: 'Bachelor of Architecture at NIT, SPA, and private architecture colleges' },
      { path: 'B.Plan', desc: 'Bachelor of Planning — some colleges accept NATA for urban planning' },
    ],
    careerLink: 'Architecture, Urban Design, Interior Design, Landscape Architecture, Real Estate',
    conductedBy: 'Council of Architecture (CoA)',
    frequency: 'Multiple times a year (Feb, Apr, Jun, Jul)',
    examPattern: 'Drawing test + PCM MCQ + General Aptitude | 200 marks | Adaptive computer-based test',
    difficulty: 'Moderate (drawing skill matters)',
    tip: 'Unlike most entrance exams, NATA tests creativity and drawing ability heavily. Start a portfolio early. Even Commerce/Arts students can attempt it if they have Maths.',
  },
  {
    id: 'cuet',
    name: 'CUET-UG',
    fullName: 'Common University Entrance Test (UG)',
    emoji: '🏫',
    color: 'emerald',
    streams: ['Science (PCM)', 'Science (PCB)', 'Science (PCMB)', 'Commerce', 'Arts / Humanities'],
    eligibility: [
      'Pass Class 12 in any stream',
      'No minimum marks for most programs',
      'Each university sets its own cutoff',
    ],
    pathsAfter: [
      { path: 'Central Universities', desc: 'DU, BHU, JNU, Hyderabad University, Jamia, AMU and 250+ central/state universities' },
      { path: 'BA / BSc / BCom / BCA', desc: 'All undergraduate programs at participating universities' },
    ],
    careerLink: 'Open-ended — depends on subject chosen. Gateway to MA/MBA/higher studies at premier universities',
    conductedBy: 'National Testing Agency (NTA)',
    frequency: 'Once a year (May)',
    examPattern: 'MCQ | Domain subjects + Language + General Test | Adaptive online test',
    difficulty: 'Low to Moderate',
    tip: 'CUET replaced college-level entrance tests for most central universities. DU, BHU, JNU all accept CUET scores. Prepare your subject sections well — it is doable alongside boards.',
  },
  {
    id: 'clat',
    name: 'CLAT',
    fullName: 'Common Law Admission Test',
    emoji: '⚖️',
    color: 'indigo',
    streams: ['Arts / Humanities', 'Commerce', 'Science (PCM)', 'Science (PCB)', 'Science (PCMB)'],
    eligibility: [
      'Pass Class 12 with minimum 45% (40% for SC/ST)',
      'Age: up to 20 years (22 for SC/ST)',
      'Any stream can appear',
    ],
    pathsAfter: [
      { path: 'BA LLB / BBA LLB (5 years)', desc: 'Integrated law programs at 24 National Law Universities (NLUs)' },
    ],
    careerLink: 'Law — Litigation, Corporate Law, Judiciary, UPSC (through IPS/IAS with law background), Policy',
    conductedBy: 'Consortium of National Law Universities',
    frequency: 'Once a year (Dec)',
    examPattern: 'MCQ from comprehension passages | English, Legal Reasoning, Logical Reasoning, Quantitative, GK | 120 questions | 2 hours',
    difficulty: 'Moderate',
    tip: 'CLAT tests reading comprehension and reasoning, not rote knowledge. 6–8 months of focused preparation is enough. NLSIU Bangalore and NALSAR Hyderabad are the top two.',
  },
]

// ─── Difficulty badge ─────────────────────────────────────────────────────────

const DIFFICULTY_STYLE = {
  'Extremely High': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  'High': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Moderate to High': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Moderate': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Low to Moderate': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Moderate (drawing skill matters)': 'text-teal-400 bg-teal-500/10 border-teal-500/20',
}

const COLOR_SCHEME = {
  blue:    { border: 'border-blue-500/25',   accent: 'text-blue-400',   bg: 'bg-blue-500/8',   pill: 'bg-blue-500/10 border-blue-500/20 text-blue-300' },
  violet:  { border: 'border-violet-500/25', accent: 'text-violet-400', bg: 'bg-violet-500/8', pill: 'bg-violet-500/10 border-violet-500/20 text-violet-300' },
  rose:    { border: 'border-rose-500/25',   accent: 'text-rose-400',   bg: 'bg-rose-500/8',   pill: 'bg-rose-500/10 border-rose-500/20 text-rose-300' },
  amber:   { border: 'border-amber-500/25',  accent: 'text-amber-400',  bg: 'bg-amber-500/8',  pill: 'bg-amber-500/10 border-amber-500/20 text-amber-300' },
  teal:    { border: 'border-teal-500/25',   accent: 'text-teal-400',   bg: 'bg-teal-500/8',   pill: 'bg-teal-500/10 border-teal-500/20 text-teal-300' },
  emerald: { border: 'border-emerald-500/25',accent: 'text-emerald-400',bg: 'bg-emerald-500/8', pill: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' },
  indigo:  { border: 'border-indigo-500/25', accent: 'text-indigo-400', bg: 'bg-indigo-500/8',  pill: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' },
}

// ─── Single exam card ─────────────────────────────────────────────────────────

function ExamCard({ exam }) {
  const [open, setOpen] = useState(false)
  const cs = COLOR_SCHEME[exam.color] || COLOR_SCHEME.blue

  return (
    <div className={`rounded-2xl border ${cs.border} bg-white/3 overflow-hidden transition-all duration-300`}>
      {/* Collapsed header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/3 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${cs.bg} flex items-center justify-center text-xl flex-shrink-0`}>
            {exam.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-white font-display font-bold text-base">{exam.name}</h4>
              <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${DIFFICULTY_STYLE[exam.difficulty] || DIFFICULTY_STYLE['Moderate']}`}>
                {exam.difficulty}
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">{exam.fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-gray-500 text-xs hidden sm:block">{exam.frequency}</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className={`border-t border-white/8 p-5 space-y-5 animate-fade-in`}>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${cs.pill}`}>
              {exam.conductedBy}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full border border-white/10 text-gray-400 bg-white/4">
              📅 {exam.frequency}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full border border-white/10 text-gray-400 bg-white/4">
              📝 {exam.examPattern}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Eligibility */}
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${cs.accent}`}>✅ Eligibility</p>
              <ul className="space-y-1.5">
                {exam.eligibility.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-gray-600 mt-0.5 flex-shrink-0">·</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Paths after */}
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${cs.accent}`}>🚀 Paths After This Exam</p>
              <ul className="space-y-2">
                {exam.pathsAfter.map((p, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-white font-semibold">{p.path}</span>
                    <span className="text-gray-500 text-xs ml-1">— {p.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Career link */}
          <div className={`${cs.bg} border ${cs.border} rounded-xl p-4`}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">🎯 Career Track</p>
            <p className="text-gray-200 text-sm leading-relaxed">{exam.careerLink}</p>
          </div>

          {/* Tip */}
          <div className="bg-saffron/8 border border-saffron/20 rounded-xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-saffron text-xs font-bold uppercase tracking-wider mb-1">Honest Tip</p>
              <p className="text-gray-300 text-sm leading-relaxed">{exam.tip}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ExamDetails component ───────────────────────────────────────────────

/**
 * ExamDetails — shows entrance exam cards relevant to the student's stream.
 * Props:
 *   stream  {string}  Student's Class 12 stream (e.g. "Science (PCM)")
 */
export default function ExamDetails({ stream }) {
  const relevant = EXAMS.filter(e =>
    !stream || e.streams.some(s =>
      s.toLowerCase() === stream.toLowerCase() ||
      stream.toLowerCase().includes(s.split(' ')[1]?.toLowerCase() || '')
    )
  )

  // If stream is completely unknown, show all exams
  const examsToShow = relevant.length > 0 ? relevant : EXAMS

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-saffron/15 border border-saffron/25 flex items-center justify-center text-xl flex-shrink-0">
          📋
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-white">Entrance Exams That Matter For You</h3>
          <p className="text-gray-400 text-sm mt-0.5">
            {stream
              ? `Showing exams relevant to your ${stream} background. Click any to expand.`
              : 'All major entrance exams after Class 12. Click any to expand.'
            }
          </p>
        </div>
      </div>

      {/* Exam cards */}
      <div className="space-y-3">
        {examsToShow.map(exam => (
          <ExamCard key={exam.id} exam={exam} />
        ))}
      </div>

      <p className="text-gray-600 text-xs text-center">
        Exam details are updated regularly. Always verify current eligibility and dates at the official exam website.
      </p>
    </div>
  )
}
