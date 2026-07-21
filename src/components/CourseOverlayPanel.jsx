import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Static Course Data ────────────────────────────────────────────────────────
const COURSE_DATA = {
  // Class 12 paths
  'B.Tech Computer Science & AI': {
    overview: 'B.Tech in Computer Science & AI is a 4-year undergraduate engineering degree focused on programming, data structures, machine learning, and software development. It is one of the most in-demand degrees in India.',
    pros: [
      '💰 Highest placement packages — ₹8L to ₹50L+ at top companies',
      '🌍 Global demand — jobs in India, US, Canada, Europe, Singapore',
      '🚀 Opens doors to startups, FAANG, government tech, and research',
      '📱 Extremely diverse career paths — software, AI, blockchain, gaming',
    ],
    cons: [
      '📚 Very competitive entrance exams (JEE Main/Advanced, MHT-CET)',
      '🏆 Tier of college matters a lot — IIT placement ≠ average college placement',
      '⚡ Constant upskilling required — tech changes every 2–3 years',
      '🧮 Needs strong Maths and logical thinking abilities',
    ],
    videos: [
      { title: 'What is B.Tech CS? Full Honest Review', id: 'eSRMdIG6lZI' },
      { title: 'B.Tech CS Placements Reality in India', id: 'cda9uyM4Fxc' },
      { title: 'How to Get Into IIT / NIT for CS', id: '5bId3N7QZec' },
    ]
  },
  'B.Sc in Data Science / Analytics': {
    overview: 'B.Sc Data Science is a 3-year degree covering statistics, Python, SQL, machine learning, and data visualization. A modern alternative to B.Tech that costs less and focuses on practical analysis skills.',
    pros: [
      '📊 High demand — every company needs data analysts now',
      '💵 Competitive salaries — ₹4L to ₹20L+ depending on skills',
      '🎓 Affordable fees — IIT Madras Online BSc is under ₹1L total',
      '🔄 Can transition to ML/AI roles with certifications',
    ],
    cons: [
      '🏛️ Not recognized as engineering — limited to analyst/scientist roles initially',
      '📐 Requires strong interest in mathematics and statistics',
      '⚠️ Brand of college matters for placements — tier-3 colleges may struggle',
      '🔁 Need supplementary certifications for top tech company interviews',
    ],
    videos: [
      { title: 'B.Sc Data Science vs B.Tech CS — Which is Better?', id: 'UA2bJzRIIxk' },
      { title: 'IIT Madras BSc Data Science Complete Review', id: 'r0xqhBc2Prk' },
      { title: 'Data Science Career Roadmap India 2024', id: 'TutlIuge3Ss' },
    ]
  },
  'Chartered Accountancy (CA)': {
    overview: 'CA is one of India\'s most prestigious professional qualifications awarded by ICAI. It covers accounting, auditing, taxation, and financial management. The journey typically takes 4–5 years after Class 12.',
    pros: [
      '🏆 Highest credibility in finance — trusted across banking, big4, corporates',
      '💼 Entrepreneurs, CFOs, and tax advisors — wide application',
      '💰 Excellent salary once qualified — ₹7L to ₹40L+ (Big4 firms)',
      '🌐 Growing demand globally — recognized qualification',
    ],
    cons: [
      '📉 Very low pass rates — CA Final passes ~10–15% students per attempt',
      '⏳ 4–5 years minimum — 3 levels (Foundation, Intermediate, Final)',
      '🔁 Multiple attempts common — setbacks are part of the journey',
      '📚 Extreme discipline required — studying while doing articleship',
    ],
    videos: [
      { title: 'CA vs MBA — Which is Better for Finance?', id: 'Tz4JyKHGq7M' },
      { title: 'How to Clear CA Foundation in First Attempt', id: 'DV2GWnpM3S0' },
      { title: 'CA Journey Reality — What Nobody Tells You', id: 'jy3GVRpFOhM' },
    ]
  },
  'BBA in Financial Analyst / Investment Banking': {
    overview: 'BBA is a 3-year undergraduate management degree focused on business, finance, marketing, and organizational management. Investment banking specialization focuses on capital markets, M&A analysis, and financial modeling.',
    pros: [
      '📈 Fast track to corporate finance without engineering',
      '🎯 CUET/IPMAT can get you into IIM integrated programs',
      '🌍 Pathway to MBA, CFA, or direct analyst roles in banks/PE firms',
      '⚡ Lower JEE pressure — management aptitude based admissions',
    ],
    cons: [
      '⚠️ College brand matters enormously — tier 3 BBA has poor placements',
      '💻 Needs CFA or MBA to reach senior Investment Banking roles',
      '🏦 Entry level analyst salaries can be modest (₹3–5L) unless top college',
      '📊 Heavy competition for front office banking jobs',
    ],
    videos: [
      { title: 'BBA vs B.Com vs BCom Hons — Which to Choose?', id: 'Q0WbMfhDCUo' },
      { title: 'Investment Banking Career in India — Full Roadmap', id: 'E7B6UhKaBi8' },
      { title: 'IPMAT Exam Preparation Strategy', id: '5fYjEt5p1Hk' },
    ]
  },
  'B.Sc Biotechnology / Genetics': {
    overview: 'B.Sc Biotechnology is a 3-year science degree covering molecular biology, genetics, cell biology, and laboratory techniques. It\'s a strong choice for PCB students who want research or pharma careers without NEET pressure.',
    pros: [
      '🔬 Growing pharmaceutical and biotech sector in India',
      '🧬 Strong foundation for M.Sc, PhD, or industry research roles',
      '💊 Pharma companies, diagnostic labs, CSIR institutes hire biotech graduates',
      '🌱 Agri-biotech, food science, and clinical research are expanding fields',
    ],
    cons: [
      '📖 B.Sc alone is often insufficient — M.Sc or PhD strongly recommended',
      '💰 Starting salaries are relatively low (₹2.5–5L) without postgraduate',
      '🏭 Limited private sector jobs without specialization',
      '🧪 Lab jobs require rigorous practical training and patience',
    ],
    videos: [
      { title: 'B.Sc Biotechnology vs MBBS — Which for PCB Students?', id: 'QVmIcLGVkaU' },
      { title: 'Biotech Career Scope India 2024', id: 'PsBZKQbbOtE' },
    ]
  },
  'Bachelor of Physiotherapy (BPT)': {
    overview: 'BPT is a 4.5-year undergraduate professional degree (including 6-month internship) training students in physical rehabilitation, musculoskeletal therapy, and patient care.',
    pros: [
      '🏥 Rapidly growing demand — sports rehab, neuro rehab, ortho clinics',
      '💼 Can open your own clinic — entrepreneurship friendly profession',
      '🌍 International recognition — physiotherapists hired in UAE, UK, Canada',
      '🤝 Patient-centered work — high job satisfaction',
    ],
    cons: [
      '⏳ 4.5 years total including mandatory internship',
      '💰 Initial salaries are modest — ₹2.5–4L starting; grows with own practice',
      '🏋️ Physically demanding work — long hours on feet',
      '📖 PG (MPT) needed for academic or senior specialist roles',
    ],
    videos: [
      { title: 'BPT Career Scope in India — Physiotherapy After 12th', id: 'SuJ4Xmj7QWA' },
      { title: 'MBBS vs BPT — Which Medical Career to Choose?', id: 'hpnfgNJKLok' },
    ]
  },
  'Integrated B.A. LL.B. (5-Year Law)': {
    overview: 'The integrated BA LLB is a 5-year undergraduate law degree combining arts subjects with comprehensive legal training. CLAT is the primary entrance exam for top National Law Universities.',
    pros: [
      '⚖️ Prestigious career path — corporate law, litigation, judiciary',
      '🏛️ NLUs provide world-class legal education comparable to global standards',
      '💼 Corporate law at Big4/Magic Circle law firms pays very well',
      '🌐 Growing demand in IP, tech law, arbitration, and international trade law',
    ],
    cons: [
      '📚 5-year commitment — very long undergraduate duration',
      '🏆 Top firm salaries only at top NLU graduates; tier-2 law colleges struggle',
      '⏳ Litigation path is slow — years to build a practice',
      '📖 Requires exceptionally strong reading, writing, and argumentation skills',
    ],
    videos: [
      { title: 'CLAT Exam — Complete Guide 2024', id: 'iCL87cpjxIM' },
      { title: 'LLB Career Scope India — Is Law Worth It?', id: 'TzE6PbIbL8U' },
      { title: 'NLU vs Private Law College — Which is Better?', id: 'Q1LJ1FqSnRQ' },
    ]
  },
  'B.Des in Graphic or UI/UX Design': {
    overview: 'B.Des is a 4-year undergraduate design degree covering product design, visual communication, UI/UX, branding, and user research. UCEED and NID DAT are the key entrance exams.',
    pros: [
      '🎨 Booming UI/UX market — every app/website needs designers',
      '💻 Remote work friendly — design is a globally portable skill',
      '🚀 Portfolio-based hiring — talent > degree for senior design roles',
      '💡 Creative and analytical combined — satisfying career path',
    ],
    cons: [
      '📐 Very portfolio-driven — academic scores matter less than your work',
      '🏫 Limited number of top design colleges (NID, NIF, IIT ID)',
      '⚠️ Freelancing market is competitive and income can be irregular initially',
      '🎓 Creative burnout is real — continuous client-driven work is demanding',
    ],
    videos: [
      { title: 'UI/UX Design Career India — 2024 Full Roadmap', id: '3aNU8Tdg5fU' },
      { title: 'UCEED Exam Preparation Complete Guide', id: 'mfBnc7iEhkk' },
      { title: 'NID vs IIT Design — Which Design College to Choose?', id: 'Fl3OBm8YHKQ' },
    ]
  },
  // Class 10 streams
  'Science (PCM)': {
    overview: 'Science PCM (Physics, Chemistry, Mathematics) is the foundation stream for engineering, architecture, and applied mathematics careers. After 12th PCM, JEE Main and Advanced are the gateway to top engineering colleges.',
    pros: [
      '⚡ Leads to highest demand career paths — engineering, IT, data science',
      '🏆 JEE success opens doors to IITs, NITs, BITS — top institutions',
      '💰 Engineering graduates earn among the highest starting salaries',
      '🌐 International career mobility — engineers hired worldwide',
    ],
    cons: [
      '📚 Class 11 PCM is a significant difficulty jump from Class 10',
      '🏋️ Requires consistent study of 6–8 hours/day for JEE preparation',
      '🔢 Strong Maths requirement — students weak in Maths will struggle',
      '⚠️ JEE competition is intense — 12+ lakh students for limited IIT seats',
    ],
    videos: [
      { title: 'PCM vs PCB vs Commerce — Which Stream to Choose?', id: 'LLvnYGGNYKM' },
      { title: 'JEE Preparation Strategy from Class 11', id: '2Oy9a7jyF3Y' },
      { title: 'Life of a PCM Student — Reality vs Expectations', id: 'Gx_RIl9-Zqg' },
    ]
  },
  'Science (PCB)': {
    overview: 'Science PCB (Physics, Chemistry, Biology) is the core medical stream. NEET-UG is the single national exam for MBBS/BDS/BAMS/BVSC admissions in India. PCB also leads to pharmacy, physiotherapy, and biotech.',
    pros: [
      '🩺 Leads to MBBS — one of the most respected professions in India',
      '💊 Multiple career options — pharmacy, nursing, physiotherapy, biotech',
      '🏥 Job security — healthcare sector always has demand',
      '🌟 Social respect and satisfaction — helping people directly',
    ],
    cons: [
      '🔬 NEET is extremely competitive — 20+ lakh students, limited MBBS seats',
      '⏳ MBBS takes 5.5 years + 1 year internship = 6.5 years minimum',
      '💰 Private medical college fees can be ₹50L–₹1.5Cr total',
      '📚 Heavy memorization required — biology requires consistent revision',
    ],
    videos: [
      { title: 'NEET Preparation Complete Guide — From Scratch', id: 'kwj_tD_LLh4' },
      { title: 'MBBS vs BAMS vs BDS — Which Medical Course is Best?', id: 'hPBjxp0Gpmk' },
      { title: 'PCB Without NEET — Other Career Options', id: 'qVvGBklSbwM' },
    ]
  },
  'Commerce': {
    overview: 'Commerce stream covers Accountancy, Business Studies, Economics, and Mathematics (optional). It leads to CA, BBA, B.Com, and finance-related careers. Commerce is versatile and less pressure-heavy than science streams.',
    pros: [
      '📊 Versatile stream — Finance, Marketing, HR, Entrepreneurship, Law all open',
      '💰 CA qualification is one of India\'s most lucrative professional paths',
      '🏦 Growing fintech sector — strong demand for commerce graduates with tech skills',
      '⚡ Entrance exams are manageable — CUET, IPMAT, CA Foundation',
    ],
    cons: [
      '📉 Switching to science/engineering later is very difficult',
      '🏛️ College brand matters for placements — tier 3 commerce graduates struggle',
      '📖 CA exam is notoriously difficult with very low pass rates',
      '🌐 Fewer international career paths without MBA unless CA/CPA qualified',
    ],
    videos: [
      { title: 'Commerce After 10th — Complete Career Guide', id: 'ZqMT8mJFHKU' },
      { title: 'CA vs MBA — Which is Better for Commerce Students?', id: 'eFWf2sQd7Vc' },
      { title: 'B.Com vs BBA — Which to Choose After 12th?', id: 'mxqIxpPXvTk' },
    ]
  },
  'Arts / Humanities': {
    overview: 'Arts and Humanities covers History, Geography, Political Science, Psychology, Sociology, English Literature, and more. It leads to civil services, law, journalism, social work, teaching, and creative fields.',
    pros: [
      '🏛️ Best stream for UPSC/IAS Civil Services preparation',
      '📝 Writing, communication, and research skills are highly valued',
      '🎯 Diverse career paths — academia, journalism, policy, NGOs, law',
      '💡 Lower academic pressure — more time for extracurriculars and skill-building',
    ],
    cons: [
      '⚠️ Societal bias still exists — many parents do not support Arts choice',
      '💰 Starting salaries lower in many arts careers vs engineering/finance',
      '🎓 UPSC success rate is very low — less than 1% of applicants clear',
      '📚 Creative careers require strong portfolio building from early on',
    ],
    videos: [
      { title: 'Arts Stream Career Options — Full Guide 2024', id: 'tD0_JkUjWnk' },
      { title: 'UPSC Preparation After 10th — When to Start?', id: 'YJ9pHCZjBXU' },
      { title: 'Why Arts Stream is Underrated in India', id: 'O7JxRMBUHyQ' },
    ]
  },
  'Diploma / Polytechnic': {
    overview: 'A 3-year Diploma in Engineering after Class 10 provides vocational technical education. Diploma holders can directly enter the workforce or get lateral entry into 2nd year of B.Tech.',
    pros: [
      '⚡ Fastest route to technical jobs — ready for employment in 3 years',
      '💰 Affordable fees — government polytechnics cost ₹10,000–₹40,000/year',
      '🔄 Lateral entry to B.Tech 2nd year — flexible academic pathway',
      '🏭 Strong demand in manufacturing, construction, and technical sectors',
    ],
    cons: [
      '🎓 Lower academic recognition vs B.Tech for management/corporate roles',
      '💼 Salary growth is slower without B.Tech or lateral entry',
      '⚠️ Government polytechnic quality varies significantly by state',
      '🔬 Medical-related careers require Class 12 PCB, not polytechnic diplomas',
    ],
    videos: [
      { title: 'Diploma vs B.Tech — Which is Better After 10th?', id: 'Wnor-QUgfN4' },
      { title: 'Polytechnic Diploma Courses and Career Scope', id: 'B7sV_Mc4x3A' },
      { title: 'Lateral Entry to B.Tech from Diploma — Complete Guide', id: '9KnEjm8hL1E' },
    ]
  },
}

// Fallback for any path not in the map
const FALLBACK_DATA = {
  overview: 'This is a highly relevant career path for your profile. It offers a combination of academic learning and practical skill development.',
  pros: [
    '✅ Strong career prospects and growing demand',
    '🌐 Multiple specialization options available',
    '💡 Good work-life balance in most roles',
    '📈 Potential for career growth and advancement',
  ],
  cons: [
    '📚 Requires dedicated preparation and consistent effort',
    '🏛️ College/institution quality significantly impacts placements',
    '⏳ Takes 3–5 years of focused education to qualify',
    '💰 Starting salaries may be modest before experience builds up',
  ],
  videos: [
    { title: 'Career Guidance India — How to Choose Your Path', id: 'mgRhA7_TBZQ' },
    { title: 'Choosing the Right Course After 12th — Full Guide', id: 'LLvnYGGNYKM' },
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CourseOverlayPanel({ path, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview')
  const data = COURSE_DATA[path] || FALLBACK_DATA

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="overflow-hidden rounded-2xl border border-saffron/20 bg-[#0d1526] mt-1"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-saffron/5">
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <div>
              <h4 className="font-display font-bold text-white text-sm leading-tight">{path}</h4>
              <p className="text-gray-400 text-xs mt-0.5">Course deep-dive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/5 px-5">
          {[
            { id: 'overview', label: '📖 Overview' },
            { id: 'pros', label: '✅ Pros' },
            { id: 'cons', label: '⚠️ Challenges' },
            { id: 'videos', label: '📺 Videos' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-3 text-xs font-semibold border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-saffron text-saffron'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-gray-300 text-sm leading-relaxed">{data.overview}</p>
            </motion.div>
          )}

          {activeTab === 'pros' && (
            <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {data.pros.map((pro, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-emerald-200 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-4 py-2.5">
                  {pro}
                </li>
              ))}
            </motion.ul>
          )}

          {activeTab === 'cons' && (
            <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {data.cons.map((con, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-rose-200 bg-rose-500/5 border border-rose-500/15 rounded-xl px-4 py-2.5">
                  {con}
                </li>
              ))}
            </motion.ul>
          )}

          {activeTab === 'videos' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <p className="text-gray-500 text-xs mb-3">Curated videos to help you understand this path better:</p>
              {data.videos.map((video, i) => (
                <a
                  key={i}
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 hover:border-red-500/30 hover:bg-red-500/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 text-xs font-medium group-hover:text-white leading-snug line-clamp-2">
                      {video.title}
                    </p>
                    <p className="text-gray-500 text-[10px] mt-0.5">YouTube →</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-saffron flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
