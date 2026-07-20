import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import YouTubePanel from '../components/YouTubePanel'

const CAREER_PATHS = [
  {
    id: 'software_engineer',
    title: 'Software Engineer',
    icon: '💻',
    color: 'from-blue-500/20 to-indigo-500/10',
    stages: [
      { id: 'current', label: 'Current Stage', icon: '📍', desc: 'Class 10/12 Student', skills: ['Basic Math', 'Logical Thinking', 'English Communication'], certs: [], salary: 'N/A', demand: 'N/A', next: ['Choose PCM stream', 'Learn basics of programming'] },
      { id: 'education', label: 'Education', icon: '🎓', desc: 'B.Tech CSE / BCA / B.Sc CS', skills: ['Data Structures', 'Algorithms', 'OOP', 'Databases'], certs: ['NPTEL Programming', 'HackerRank Certification'], salary: 'N/A', demand: 'Very High', next: ['Prepare for JEE/KCET', 'Start coding on LeetCode'] },
      { id: 'entrance', label: 'Entrance Exams', icon: '📝', desc: 'JEE Main / KCET / COMEDK / Direct', skills: ['Problem Solving', 'Time Management', 'Physics + Math'], certs: [], salary: 'N/A', demand: 'Very High', next: ['Practice mock tests', 'Join coaching if needed'] },
      { id: 'college', label: 'College', icon: '🏫', desc: '4-year B.Tech or 3-year BCA', skills: ['Full Stack Dev', 'System Design', 'Git & DevOps', 'Cloud Computing'], certs: ['AWS Cloud Practitioner', 'Google IT Support'], salary: 'N/A', demand: 'Very High', next: ['Build 5+ projects', 'Contribute to open source'] },
      { id: 'internship', label: 'Internships', icon: '💼', desc: '2-6 month industry internship', skills: ['Team Collaboration', 'Agile/Scrum', 'Code Review', 'Testing'], certs: ['Coursera Specialization'], salary: '₹10K–₹40K/month', demand: 'Very High', next: ['Apply via LinkedIn/AngelList', 'Network at tech meetups'] },
      { id: 'first_job', label: 'First Job', icon: '🚀', desc: 'Junior/Associate Software Engineer', skills: ['React/Angular', 'Node.js/Python', 'SQL', 'REST APIs'], certs: ['Meta Front-End Developer', 'Google Data Analytics'], salary: '₹4–12 LPA', demand: 'Very High', next: ['Focus on one tech stack', 'Build side projects'] },
      { id: 'mid_career', label: 'Mid Career', icon: '📈', desc: 'Senior Engineer / Tech Lead', skills: ['System Architecture', 'Mentoring', 'Performance Optimization'], certs: ['AWS Solutions Architect', 'Kubernetes'], salary: '₹15–35 LPA', demand: 'High', next: ['Lead projects', 'Speak at conferences'] },
      { id: 'senior', label: 'Ultimate Goal', icon: '👑', desc: 'Staff Engineer / Engineering Manager / CTO', skills: ['Leadership', 'Strategic Thinking', 'Business Acumen'], certs: ['MBA (optional)', 'Management Certifications'], salary: '₹40–80+ LPA', demand: 'High', next: ['Build a team', 'Shape company tech strategy'] },
    ]
  },
  {
    id: 'data_scientist',
    title: 'Data Scientist',
    icon: '📊',
    color: 'from-purple-500/20 to-violet-500/10',
    stages: [
      { id: 'current', label: 'Current Stage', icon: '📍', desc: 'Student with Math aptitude', skills: ['Statistics Basics', 'Excel', 'Logical Reasoning'], certs: [], salary: 'N/A', demand: 'N/A', next: ['Focus on Math & Statistics', 'Learn Python basics'] },
      { id: 'education', label: 'Education', icon: '🎓', desc: 'B.Tech CSE/IT or B.Sc Statistics/Math', skills: ['Linear Algebra', 'Probability', 'Python', 'R'], certs: ['Coursera ML Specialization'], salary: 'N/A', demand: 'Very High', next: ['Take online ML courses', 'Practice on Kaggle'] },
      { id: 'entrance', label: 'Entrance Exams', icon: '📝', desc: 'JEE / CUET / University Entrance', skills: ['Math + Science', 'Quantitative Aptitude'], certs: [], salary: 'N/A', demand: 'Very High', next: ['Focus on math sections', 'Build analysis portfolio'] },
      { id: 'college', label: 'College', icon: '🏫', desc: '4-year degree with Data Science focus', skills: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision'], certs: ['Google Data Analytics', 'IBM Data Science'], salary: 'N/A', demand: 'Very High', next: ['Kaggle competitions', 'Research papers'] },
      { id: 'internship', label: 'Internships', icon: '💼', desc: 'Data Analyst / ML Intern', skills: ['SQL', 'Tableau/PowerBI', 'A/B Testing', 'ETL'], certs: ['Tableau Desktop Specialist'], salary: '₹15K–₹50K/month', demand: 'Very High', next: ['Work on real datasets', 'Learn business context'] },
      { id: 'first_job', label: 'First Job', icon: '🚀', desc: 'Junior Data Scientist / Analyst', skills: ['Scikit-learn', 'TensorFlow/PyTorch', 'Feature Engineering'], certs: ['AWS ML Specialty'], salary: '₹6–15 LPA', demand: 'Very High', next: ['Specialize in a domain', 'Publish on Medium/GitHub'] },
      { id: 'mid_career', label: 'Mid Career', icon: '📈', desc: 'Senior Data Scientist / ML Engineer', skills: ['MLOps', 'Model Deployment', 'Research', 'Team Leadership'], certs: ['Google Cloud ML Engineer'], salary: '₹20–45 LPA', demand: 'High', next: ['Lead ML projects', 'Patent innovations'] },
      { id: 'senior', label: 'Ultimate Goal', icon: '👑', desc: 'Principal Scientist / VP Analytics / AI Founder', skills: ['AI Strategy', 'Business Intelligence', 'Research Direction'], certs: ['PhD (optional)', 'Executive Programs'], salary: '₹50–100+ LPA', demand: 'High', next: ['Shape AI strategy', 'Build AI products'] },
    ]
  },
  {
    id: 'doctor',
    title: 'Doctor (MBBS)',
    icon: '🩺',
    color: 'from-emerald-500/20 to-green-500/10',
    stages: [
      { id: 'current', label: 'Current Stage', icon: '📍', desc: 'Science (PCB) Student', skills: ['Biology', 'Chemistry', 'Empathy'], certs: [], salary: 'N/A', demand: 'N/A', next: ['Focus on NEET prep', 'Shadow doctors if possible'] },
      { id: 'entrance', label: 'NEET Exam', icon: '📝', desc: 'NEET-UG for MBBS admission', skills: ['Biology Mastery', 'Chemistry Concepts', 'Physics Basics'], certs: [], salary: 'N/A', demand: 'Very High', next: ['Join NEET coaching', 'Solve 10+ years papers'] },
      { id: 'college', label: 'MBBS', icon: '🏫', desc: '5.5 years (including internship)', skills: ['Anatomy', 'Physiology', 'Pharmacology', 'Clinical Skills'], certs: ['First Aid Certification'], salary: 'Stipend: ₹15–30K/month', demand: 'Very High', next: ['Excel in clinical rotations', 'Prepare for NEET PG'] },
      { id: 'pg', label: 'PG Specialization', icon: '🔬', desc: 'MD/MS (3 years)', skills: ['Surgical Skills', 'Research', 'Specialized Medicine'], certs: ['MD/MS Degree'], salary: '₹50K–₹1L/month', demand: 'Very High', next: ['Choose specialization wisely', 'Publish research'] },
      { id: 'first_job', label: 'First Practice', icon: '🚀', desc: 'Specialist Doctor', skills: ['Patient Management', 'Diagnosis', 'Surgery'], certs: ['Medical License'], salary: '₹10–25 LPA', demand: 'Very High', next: ['Build patient trust', 'Join reputed hospital'] },
      { id: 'senior', label: 'Ultimate Goal', icon: '👑', desc: 'Senior Consultant / Own Clinic / Professor', skills: ['Leadership', 'Hospital Management', 'Teaching'], certs: ['Super Specialization (DM/MCh)'], salary: '₹30–100+ LPA', demand: 'Very High', next: ['Open own practice', 'Contribute to medical education'] },
    ]
  },
  {
    id: 'ca',
    title: 'Chartered Accountant',
    icon: '📋',
    color: 'from-amber-500/20 to-yellow-500/10',
    stages: [
      { id: 'current', label: 'Current Stage', icon: '📍', desc: 'Commerce Student', skills: ['Accounting Basics', 'Math', 'Excel'], certs: [], salary: 'N/A', demand: 'N/A', next: ['Register for CA Foundation', 'Study accounts thoroughly'] },
      { id: 'foundation', label: 'CA Foundation', icon: '📝', desc: 'Entry-level CA exam', skills: ['Accounting', 'Business Law', 'Economics', 'Math'], certs: ['CA Foundation Pass'], salary: 'N/A', demand: 'High', next: ['Clear in first attempt', 'Join articleship soon'] },
      { id: 'intermediate', label: 'CA Intermediate', icon: '📚', desc: '8 papers in 2 groups', skills: ['Advanced Accounting', 'Taxation', 'Audit', 'Cost Accounting'], certs: ['CA Inter Pass'], salary: 'Articleship Stipend', demand: 'High', next: ['Join Big 4 firms for articleship', 'Self-study or coaching'] },
      { id: 'articleship', label: 'Articleship', icon: '💼', desc: '3 years mandatory training', skills: ['Practical Auditing', 'Tax Filing', 'Client Management'], certs: [], salary: '₹5K–₹25K/month', demand: 'High', next: ['Learn from senior CAs', 'Prepare for CA Final alongside'] },
      { id: 'final', label: 'CA Final', icon: '🏆', desc: 'Final examination', skills: ['Financial Reporting', 'Strategic Management', 'Advanced Audit'], certs: ['CA Membership'], salary: 'N/A', demand: 'High', next: ['Clear both groups', 'Network for job offers'] },
      { id: 'first_job', label: 'First Job', icon: '🚀', desc: 'Junior CA / Audit Associate', skills: ['IFRS', 'Tax Planning', 'Due Diligence'], certs: ['CA License'], salary: '₹7–15 LPA', demand: 'High', next: ['Specialize in a domain', 'Consider Big 4 or industry'] },
      { id: 'senior', label: 'Ultimate Goal', icon: '👑', desc: 'CFO / Partner at CA Firm / Own Practice', skills: ['Strategic Finance', 'M&A', 'Leadership'], certs: ['CPA/CFA (optional)'], salary: '₹30–80+ LPA', demand: 'High', next: ['Build client base', 'Establish own firm'] },
    ]
  },
  {
    id: 'designer',
    title: 'UI/UX Designer',
    icon: '🎨',
    color: 'from-pink-500/20 to-rose-500/10',
    stages: [
      { id: 'current', label: 'Current Stage', icon: '📍', desc: 'Creative Student', skills: ['Visual Thinking', 'Creativity', 'Observation'], certs: [], salary: 'N/A', demand: 'N/A', next: ['Start with Figma', 'Redesign existing apps for practice'] },
      { id: 'education', label: 'Education', icon: '🎓', desc: 'B.Des / BFA / Self-taught', skills: ['Typography', 'Color Theory', 'Layout Design', 'Prototyping'], certs: ['Google UX Design Certificate'], salary: 'N/A', demand: 'High', next: ['Build a portfolio website', 'Study design systems'] },
      { id: 'internship', label: 'Internships', icon: '💼', desc: 'Design Intern at startups/agencies', skills: ['Figma', 'User Research', 'Wireframing', 'Design Thinking'], certs: ['Interaction Design Foundation'], salary: '₹10K–₹30K/month', demand: 'High', next: ['Work on real products', 'Get user feedback'] },
      { id: 'first_job', label: 'First Job', icon: '🚀', desc: 'Junior UI/UX Designer', skills: ['Design Systems', 'Usability Testing', 'Motion Design', 'Accessibility'], certs: ['Adobe Certified'], salary: '₹4–10 LPA', demand: 'High', next: ['Specialize (product/visual/motion)', 'Present at design meetups'] },
      { id: 'mid_career', label: 'Mid Career', icon: '📈', desc: 'Senior Designer / Design Lead', skills: ['Design Strategy', 'Mentoring', 'Cross-functional Leadership'], certs: ['HFI CUA', 'Nielsen Norman UX'], salary: '₹12–30 LPA', demand: 'High', next: ['Lead design teams', 'Shape product vision'] },
      { id: 'senior', label: 'Ultimate Goal', icon: '👑', desc: 'Head of Design / Design Director / Founder', skills: ['Business Strategy', 'Brand Building', 'Innovation'], certs: ['MBA (optional)'], salary: '₹30–60+ LPA', demand: 'High', next: ['Build a design studio', 'Influence industry standards'] },
    ]
  },
  {
    id: 'civil_services',
    title: 'IAS / Civil Services',
    icon: '🏛️',
    color: 'from-teal-500/20 to-cyan-500/10',
    stages: [
      { id: 'current', label: 'Current Stage', icon: '📍', desc: 'Any Stream Student', skills: ['General Knowledge', 'Reading Habit', 'Current Affairs'], certs: [], salary: 'N/A', demand: 'N/A', next: ['Read newspapers daily', 'Start NCERT foundation'] },
      { id: 'education', label: 'Graduation', icon: '🎓', desc: 'Any Bachelor\'s Degree', skills: ['Analytical Writing', 'Ethics', 'Indian Polity', 'Economics'], certs: ['Any UG Degree'], salary: 'N/A', demand: 'Stable', next: ['Choose optional subject', 'Start prelims prep in final year'] },
      { id: 'preparation', label: 'UPSC Preparation', icon: '📝', desc: '1-3 years focused prep', skills: ['Essay Writing', 'Answer Structuring', 'Current Affairs', 'Geography'], certs: [], salary: 'N/A', demand: 'Stable', next: ['Join coaching or self-study', 'Give mock tests'] },
      { id: 'exam', label: 'UPSC CSE', icon: '🏆', desc: 'Prelims → Mains → Interview', skills: ['Time Management', 'Personality Development', 'Subject Mastery'], certs: ['UPSC Qualification'], salary: 'N/A', demand: 'Stable', next: ['Clear prelims first', 'Focus on mains answer writing'] },
      { id: 'training', label: 'LBSNAA Training', icon: '🏫', desc: '2-year Foundation Course', skills: ['Administration', 'Law', 'Public Policy', 'Leadership'], certs: ['IAS/IPS/IFS Officer'], salary: '₹56,100/month (start)', demand: 'Prestigious', next: ['Build strong network', 'Learn field administration'] },
      { id: 'senior', label: 'Ultimate Goal', icon: '👑', desc: 'Secretary / Chief Secretary / Ambassador', skills: ['Policy Making', 'Governance', 'Diplomacy', 'Nation Building'], certs: ['Career Progression'], salary: '₹2.5L/month + perks', demand: 'Prestigious', next: ['Serve with integrity', 'Drive policy reforms'] },
    ]
  },
]

function StageNode({ stage, isActive, isCompleted, onClick, index, total }) {
  return (
    <div className="flex items-start gap-4">
      {/* Timeline Line + Dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-xl transition-all duration-300 z-10 ${
            isActive
              ? 'bg-saffron border-saffron text-white shadow-lg shadow-saffron/30'
              : isCompleted
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              : 'bg-white/5 border-white/15 text-gray-500 hover:border-saffron/40'
          }`}
        >
          {stage.icon}
        </motion.button>
        {index < total - 1 && (
          <div className={`w-0.5 h-16 ${isCompleted ? 'bg-emerald-500/40' : 'bg-white/10'} transition-colors duration-300`} />
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{ opacity: isActive ? 1 : 0.6 }}
        className={`flex-1 pb-6 cursor-pointer ${isActive ? '' : 'opacity-60 hover:opacity-80'}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-display font-bold ${isActive ? 'text-white text-lg' : 'text-gray-300 text-base'}`}>
            {stage.label}
          </h3>
          {isCompleted && <span className="tag tag-emerald text-[8px]">✓ Passed</span>}
        </div>
        <p className="text-gray-400 text-sm">{stage.desc}</p>
      </motion.div>
    </div>
  )
}

function StageDetail({ stage, pathId }) {
  return (
    <motion.div
      key={stage.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-card-premium p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-saffron/15 border border-saffron/30 flex items-center justify-center text-3xl">
          {stage.icon}
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-white">{stage.label}</h2>
          <p className="text-gray-400 text-sm">{stage.desc}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Skills Required */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-sm font-bold text-saffron uppercase tracking-wider mb-3">🛠️ Skills Required</h3>
          <div className="flex flex-wrap gap-2">
            {stage.skills.map((s, i) => (
              <span key={i} className="tag tag-blue">{s}</span>
            ))}
          </div>
        </div>

        {/* Certifications */}
        {stage.certs.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">📜 Certifications</h3>
            <div className="space-y-2">
              {stage.certs.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-emerald-400">✦</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Salary */}
        {stage.salary !== 'N/A' && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">💰 Salary Expectations</h3>
            <p className="text-xl font-display font-bold text-white">{stage.salary}</p>
          </div>
        )}

        {/* Industry Demand */}
        {stage.demand !== 'N/A' && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">📈 Industry Demand</h3>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                stage.demand === 'Very High' ? 'bg-emerald-500/15 text-emerald-400' :
                stage.demand === 'High' ? 'bg-blue-500/15 text-blue-400' :
                stage.demand === 'Stable' ? 'bg-amber-500/15 text-amber-400' :
                'bg-gray-500/15 text-gray-400'
              }`}>
                {stage.demand}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Next Steps */}
      <div className="mt-6 bg-saffron/8 border border-saffron/15 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-saffron uppercase tracking-wider mb-3">🚀 Action Steps</h3>
        <div className="space-y-2">
          {stage.next.map((n, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-200">
              <span className="w-6 h-6 rounded-lg bg-saffron/10 border border-saffron/20 flex items-center justify-center text-[10px] text-saffron font-bold flex-shrink-0">{i+1}</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* YouTubePanel for career roadmap video guidance */}
      <YouTubePanel topic={pathId} title={`Curated Video Guide for ${stage.label}`} />
    </motion.div>
  )
}

export default function CareerPipeline() {
  const [selectedPath, setSelectedPath] = useState(null)
  const [activeStageIdx, setActiveStageIdx] = useState(0)

  const path = CAREER_PATHS.find(p => p.id === selectedPath)

  const handlePathSwitch = useCallback((pathId) => {
    setSelectedPath(pathId)
    setActiveStageIdx(0)
  }, [])

  return (
    <main className="pt-24 pb-20 min-h-screen px-4 sm:px-6 lg:px-8 font-sans relative">
      <div className="fixed inset-0 bg-mesh-premium pointer-events-none" />
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none opacity-30" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-5 py-2 mb-6">
            <span className="text-lg">🗺️</span>
            <span className="text-emerald-300 text-sm font-semibold">Interactive Career Pipeline</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-black text-white mb-4">
            Your Career <span className="gradient-text">Roadmap</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Select a career path and explore every stage from where you are now to your ultimate goal.
            Every node is clickable — switch paths anytime.
          </p>
        </motion.div>

        {/* Career Path Selection */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
          {CAREER_PATHS.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePathSwitch(p.id)}
              className={`p-5 rounded-2xl border text-left bg-gradient-to-br ${p.color} transition-all duration-300 ${
                selectedPath === p.id ? 'ring-2 ring-saffron/50 border-saffron/30' : 'border-white/10'
              }`}
            >
              <span className="text-3xl">{p.icon}</span>
              <h3 className="font-display font-bold text-white text-sm mt-2">{p.title}</h3>
            </motion.button>
          ))}
        </div>

        {/* Pipeline */}
        <AnimatePresence mode="wait">
          {path && (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-[320px_1fr] gap-8"
            >
              {/* Timeline */}
              <div className="glass-card p-6 rounded-2xl border border-white/10 self-start lg:sticky lg:top-24">
                <h3 className="font-display font-bold text-white text-lg mb-6 flex items-center gap-2">
                  <span>{path.icon}</span> {path.title}
                </h3>
                <div>
                  {path.stages.map((stage, i) => (
                    <StageNode
                      key={stage.id}
                      stage={stage}
                      index={i}
                      total={path.stages.length}
                      isActive={i === activeStageIdx}
                      isCompleted={i < activeStageIdx}
                      onClick={() => setActiveStageIdx(i)}
                    />
                  ))}
                </div>
              </div>

              {/* Stage Detail */}
              <AnimatePresence mode="wait">
                <StageDetail key={path.stages[activeStageIdx].id} stage={path.stages[activeStageIdx]} pathId={path.id} />
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!selectedPath && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card-premium p-16 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="font-display text-2xl font-bold text-white mb-2">Select a Career Path</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Click on any career above to see your complete journey — from where you are now to your ultimate career goal.
            </p>
          </motion.div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/onboarding" className="btn-primary text-sm py-3 px-6">Get Personalized Guidance</Link>
            <Link to="/competitive-exams" className="btn-outline text-sm py-3 px-6">Check Exam Rankings</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
