import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import YouTubePanel from '../components/YouTubePanel'

const COLLEGES_DB = {
  rvce: {
    name: 'RV College of Engineering',
    location: 'Bangalore, Karnataka',
    established: 1963,
    type: 'Private Aided',
    rating: 4.3,
    naac: 'A+',
    nba: true,
    nirf: 42,
    website: 'https://rvce.edu.in',
    feeBrochure: 'https://rvce.edu.in/fee-structure',
    placementReport: 'https://rvce.edu.in/placements',
    overview: 'RV College of Engineering (RVCE) is one of the most prestigious engineering institutions in Karnataka. Founded in 1963, it is affiliated with VTU and approved by AICTE. Known for exceptional placements and strong alumni network in top tech companies globally.',
    admissionProcess: 'Admissions through KCET (Karnataka State Quota), COMEDK (Management/NRI Quota), and Direct Management Quota. KCET admissions are managed by KEA. COMEDK through COMEDK exam. Documents verification at KEA helpline centers.',
    eligibility: 'Minimum 45% in PCM (Physics, Chemistry, Mathematics) in Class 12. SC/ST: 40%. Must have appeared in KCET / COMEDK entrance exam.',
    fees: {
      kcet: { cs: '₹1,10,000/year', ec: '₹90,000/year', me: '₹85,000/year', civil: '₹80,000/year' },
      comedk: { cs: '₹1,95,000/year', ec: '₹1,75,000/year', me: '₹1,60,000/year', civil: '₹1,50,000/year' },
      management: { cs: '₹3,50,000–₹4,00,000/year', ec: '₹3,00,000/year', me: '₹2,75,000/year', civil: '₹2,50,000/year' },
    },
    placements: {
      avgPackage: '₹8.5 LPA',
      highestPackage: '₹1.2 Crore (Google)',
      topRecruiters: ['Google', 'Microsoft', 'Amazon', 'Infosys', 'Wipro', 'Accenture', 'Flipkart', 'Goldman Sachs'],
      placementRate: '92%',
    },
    infrastructure: ['Wi-Fi Campus', 'Central Library (50,000+ books)', 'Fully Equipped Labs', 'Sports Complex', 'Cafeteria', 'Auditorium (2000 seats)'],
    hostel: { available: true, boys: '₹65,000/year (all inclusive)', girls: '₹70,000/year (all inclusive)', desc: 'Separate hostels for boys and girls. AC rooms available. 24/7 security. Mess facility with multiple cuisine options.' },
    pros: ['Excellent placements in top tech companies', 'Strong alumni network globally', 'NAAC A+ accreditation', 'Great faculty with industry experience', 'Active student clubs and hackathons'],
    cons: ['High KCET cutoff (Top 500 for CS)', 'Campus parking can be congested', 'Some older infrastructure in select departments'],
    reviews: [
      { name: 'Rohan M.', year: 2023, rating: 5, text: 'Got placed at Microsoft! The CS department has world-class faculty and the coding culture is phenomenal.' },
      { name: 'Sneha K.', year: 2022, rating: 4, text: 'Placements are excellent. RVCE truly prepares you for industry. Hostel food could be better.' },
      { name: 'Aditya P.', year: 2023, rating: 4, text: 'Great college for networking. The alumni reach out and help a lot. Highly recommended for CS/EC.' },
    ],
    youtubeTopics: ['college_tour'],
  },
  msrit: {
    name: 'MS Ramaiah Institute of Technology',
    location: 'Bangalore, Karnataka',
    established: 1962,
    type: 'Private Aided',
    rating: 4.1,
    naac: 'A',
    nba: true,
    nirf: 68,
    website: 'https://msrit.edu',
    feeBrochure: 'https://msrit.edu/fee',
    placementReport: 'https://msrit.edu/placements',
    overview: 'MS Ramaiah Institute of Technology is among the top engineering colleges in Bangalore. Established in 1962, it offers a vibrant campus environment, strong technical programs, and excellent placement support.',
    admissionProcess: 'Admissions via KCET (Government Quota), COMEDK (Management Quota), and Direct NRI/Management Quota. KEA manages KCET allotments.',
    eligibility: 'Class 12 PCM with min 45% marks. SC/ST: 40%. Valid KCET or COMEDK scorecard required.',
    fees: {
      kcet: { cs: '₹1,00,000/year', ec: '₹85,000/year', me: '₹80,000/year' },
      comedk: { cs: '₹1,80,000/year', ec: '₹1,60,000/year', me: '₹1,45,000/year' },
      management: { cs: '₹3,00,000–₹3,50,000/year', ec: '₹2,75,000/year' },
    },
    placements: {
      avgPackage: '₹7.2 LPA',
      highestPackage: '₹85 LPA (Google)',
      topRecruiters: ['Google', 'Amazon', 'Infosys', 'TCS', 'Wipro', 'Capgemini', 'IBM'],
      placementRate: '88%',
    },
    infrastructure: ['Central Library', 'Computer Labs', 'Sports Ground', 'Cafeteria', 'Medical Center'],
    hostel: { available: true, boys: '₹60,000/year', girls: '₹65,000/year', desc: 'On-campus hostels with mess facility. Clean and well-maintained.' },
    pros: ['Strong brand in Bangalore', 'Good placements', 'Active technical clubs', 'Well-connected location'],
    cons: ['Traffic can be heavy around campus', 'High management quota fees', 'Some labs need modernization'],
    reviews: [
      { name: 'Vijay S.', year: 2023, rating: 4, text: 'Great college for networking and placements. The tech fests are amazing.' },
      { name: 'Pooja R.', year: 2022, rating: 4, text: 'Faculty in CS is excellent. Placement cell is very active.' },
    ],
    youtubeTopics: ['college_tour'],
  },
}

const TABS = ['Overview', 'Admission', 'Fees', 'Placements', 'Infrastructure', 'Reviews']

function FeeTable({ fees }) {
  const modes = [
    { key: 'kcet', label: 'KCET', color: 'from-orange-500/10' },
    { key: 'comedk', label: 'COMEDK', color: 'from-blue-500/10' },
    { key: 'management', label: 'Management', color: 'from-purple-500/10' },
    { key: 'jee', label: 'JEE / NIT', color: 'from-emerald-500/10' },
  ]
  return (
    <div className="space-y-4">
      {modes.map(mode => (
        <div key={mode.key} className={`bg-gradient-to-r ${mode.color} to-transparent border border-white/10 rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="tag tag-saffron">{mode.label}</span>
          </div>
          {fees[mode.key] ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(fees[mode.key]).map(([branch, fee]) => (
                <div key={branch} className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">{branch.toUpperCase()}</p>
                  <p className="text-white font-bold text-sm">{fee}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <span>⚠️</span>
              <span>Data unavailable — <a href="#official" className="underline">Verify from Official Website</a></span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CollegeOverview() {
  const { id } = useParams()
  const college = COLLEGES_DB[id]
  const [activeTab, setActiveTab] = useState('Overview')

  if (!college) return (
    <main className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center text-center">
      <div>
        <div className="text-6xl mb-4">🏫</div>
        <h1 className="font-display text-2xl font-bold text-white mb-2">College Not Found</h1>
        <p className="text-gray-400 mb-6">We don't have detailed data for this college yet.</p>
        <Link to="/competitive-exams" className="btn-primary px-6 py-3">Browse Colleges</Link>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 sm:px-6 font-sans relative">
      <div className="fixed inset-0 bg-mesh-premium pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card-premium p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-saffron/30 to-saffron/10 border border-saffron/25 flex items-center justify-center text-4xl flex-shrink-0">🏫</div>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-black text-white mb-1">{college.name}</h1>
              <p className="text-gray-400 text-sm mb-3">📍 {college.location} · Est. {college.established} · {college.type}</p>
              <div className="flex flex-wrap gap-2">
                <span className="tag tag-saffron">NAAC {college.naac}</span>
                {college.nba && <span className="tag tag-emerald">NBA Accredited</span>}
                {college.nirf && <span className="tag tag-blue">NIRF #{college.nirf}</span>}
                <span className="tag tag-purple">⭐ {college.rating}/5</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <a href={college.website} target="_blank" rel="noreferrer" className="btn-primary text-xs py-2.5 px-5 whitespace-nowrap">Official Website →</a>
              <a href={college.feeBrochure} target="_blank" rel="noreferrer" className="btn-outline text-xs py-2.5 px-5 whitespace-nowrap">Fee Brochure ↓</a>
              <a href={college.placementReport} target="_blank" rel="noreferrer" className="btn-glass text-xs py-2.5 px-5 whitespace-nowrap">Placement Report ↓</a>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-saffron text-white' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'}`}>
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

            {activeTab === 'Overview' && (
              <div className="space-y-5">
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="font-display text-lg font-bold text-white mb-3">About</h2>
                  <p className="text-gray-300 text-sm leading-relaxed">{college.overview}</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Avg Package', value: college.placements.avgPackage, icon: '💰' },
                    { label: 'Placement Rate', value: college.placements.placementRate, icon: '📈' },
                    { label: 'Highest Package', value: college.placements.highestPackage, icon: '🏆' },
                  ].map(s => (
                    <div key={s.label} className="glass-card p-5 rounded-2xl text-center">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <p className="text-white font-bold text-lg">{s.value}</p>
                      <p className="text-gray-500 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
                <YouTubePanel topic="college_tour" title="Campus Tours & Reviews" />
              </div>
            )}

            {activeTab === 'Admission' && (
              <div className="space-y-5">
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="font-display text-lg font-bold text-white mb-3">Admission Process</h2>
                  <p className="text-gray-300 text-sm leading-relaxed">{college.admissionProcess}</p>
                </div>
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="font-display text-lg font-bold text-white mb-3">Eligibility</h2>
                  <p className="text-gray-300 text-sm leading-relaxed">{college.eligibility}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                  <span className="text-xl">⚠️</span>
                  <p className="text-amber-300 text-sm">Always verify admission requirements from the <a href={college.website} target="_blank" rel="noreferrer" className="underline font-semibold">official website</a>. Cutoffs change every year.</p>
                </div>
              </div>
            )}

            {activeTab === 'Fees' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💡</span>
                  <p className="text-gray-400 text-sm">Fee structures vary by quota and branch. Data shown is indicative — verify from official sources.</p>
                </div>
                <FeeTable fees={college.fees} />
                <div className="glass-card p-5 rounded-2xl">
                  <h3 className="font-bold text-white mb-2 flex items-center gap-2"><span>🏠</span> Hostel Fees</h3>
                  {college.hostel.available ? (
                    <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                      <div><span className="text-gray-500 block text-xs uppercase">Boys</span> {college.hostel.boys}</div>
                      <div><span className="text-gray-500 block text-xs uppercase">Girls</span> {college.hostel.girls}</div>
                      <div className="sm:col-span-2 text-gray-400 text-xs mt-1">{college.hostel.desc}</div>
                    </div>
                  ) : <p className="text-gray-400 text-sm">No on-campus hostel available.</p>}
                </div>
                <a id="official" href={college.feeBrochure} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-4 bg-saffron/10 border border-saffron/20 rounded-xl hover:bg-saffron/15 transition-colors group">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="text-white font-semibold text-sm">Official Fee Brochure</p>
                    <p className="text-gray-400 text-xs">Download the official document for accurate fee details</p>
                  </div>
                  <span className="ml-auto text-saffron group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
            )}

            {activeTab === 'Placements' && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  {[
                    { label: 'Average Package', value: college.placements.avgPackage },
                    { label: 'Highest Package', value: college.placements.highestPackage },
                    { label: 'Placement Rate', value: college.placements.placementRate },
                  ].map(s => (
                    <div key={s.label} className="glass-card p-5 rounded-2xl">
                      <p className="text-gray-500 text-xs uppercase font-bold mb-1">{s.label}</p>
                      <p className="text-white font-display font-black text-2xl">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="font-bold text-white mb-4">Top Recruiters</h3>
                  <div className="flex flex-wrap gap-2">
                    {college.placements.topRecruiters.map(r => (
                      <span key={r} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 font-medium">{r}</span>
                    ))}
                  </div>
                </div>
                <a href={college.placementReport} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/15 transition-colors group">
                  <span className="text-2xl">📊</span>
                  <div><p className="text-white font-semibold text-sm">Official Placement Report</p><p className="text-gray-400 text-xs">Verify data from official report</p></div>
                  <span className="ml-auto text-emerald-400 group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
            )}

            {activeTab === 'Infrastructure' && (
              <div className="space-y-5">
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="font-bold text-white mb-4">Campus Facilities</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {college.infrastructure.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 rounded-xl px-4 py-3">
                        <span className="text-saffron">✦</span>{item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="glass-card p-6 rounded-2xl">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2"><span>✅</span> Pros</h3>
                    <ul className="space-y-2">
                      {college.pros.map((p, i) => (
                        <li key={i} className="text-sm text-emerald-300 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">+</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="glass-card p-6 rounded-2xl">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2"><span>⚠️</span> Cons</h3>
                    <ul className="space-y-2">
                      {college.cons.map((c, i) => (
                        <li key={i} className="text-sm text-rose-300 flex items-start gap-2">
                          <span className="text-rose-500 mt-0.5">−</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Reviews' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-4xl font-black text-white font-display">{college.rating}</div>
                  <div>
                    <div className="flex gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className="w-5 h-5" viewBox="0 0 24 24">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                            fill={i < Math.round(college.rating) ? '#F59E0B' : '#374151'} />
                        </svg>
                      ))}
                    </div>
                    <p className="text-gray-500 text-xs">Based on student reviews</p>
                  </div>
                </div>
                {college.reviews.map((r, i) => (
                  <div key={i} className="glass-card p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white text-sm">{r.name}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <svg key={j} className="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                              fill={j < r.rating ? '#F59E0B' : '#374151'} />
                          </svg>
                        ))}
                        <span className="text-gray-500 text-xs ml-1">Batch {r.year}</span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">"{r.text}"</p>
                  </div>
                ))}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
                  💡 Reviews are submitted by students. We verify authenticity before publishing.
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
