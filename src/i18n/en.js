/**
 * en.js — English string keys for Phase 4 components.
 *
 * STRUCTURE CONVENTION
 * ────────────────────
 * Keys are namespaced by component/section (e.g. chatbot.*, courseReality.*, examDetails.*).
 * The value is the English string. When a new language is added, create a matching
 * file (e.g. hi.js) with the same keys and translated values.
 *
 * HOW TO USE
 * ──────────
 * import { useTranslation } from '../hooks/useTranslation'
 * const { t } = useTranslation()
 * t('chatbot.title') // → "Ask Anything"
 *
 * IMPORTANT: Do not import this file directly in components — always go through
 * the useTranslation hook so the language can be switched transparently.
 */

const en = {
  _meta: {
    language: 'en',
    name: 'English',
    direction: 'ltr',
  },

  // ── Chatbot page ────────────────────────────────────────────────────────────
  chatbot: {
    title: 'Ask Anything',
    subtitle: 'General career & course queries · No sign-in needed',
    placeholder: "Ask anything — 'What is NEET?', 'Best path after Commerce?'...",
    sendLabel: 'Send message',
    quickQuestionsLabel: 'Or try a quick question:',
    handoffTitle: 'For this, you need personalised guidance',
    handoffCta: 'Get Personalised Guidance →',
    fullGuidanceCta: 'Full Guidance →',
    footerLink: 'Start the full form',
    intro: "Hi! I'm here to answer your questions about courses, streams, entrance exams, and career paths in India.\n\nAsk me anything — general questions about streams, colleges, or entrance exams. If your question needs personalised guidance, I'll help you get there.",
    floatingButton: 'Have a quick question?',
    floatingSubtext: 'Ask me anything about courses →',
    errorMessage: 'Could not connect to the server. Please try again.',
    genericError: "Sorry, I couldn't process that right now. Please try again in a moment.",
  },

  // ── CourseReality component ────────────────────────────────────────────────
  courseReality: {
    triggerPrefix: 'See what',
    triggerSuffix: 'is really like',
    tabOverview: '📋 Overview',
    tabVideos: '▶️ Videos',
    tabOutcomes: '📊 Outcomes',
    tabVoices: '💬 Voices',
    prosHeading: '✅ Advantages',
    consHeading: '⚠️ Realities / Challenges',
    mentorCtaTitle: 'Talk to a Mentor',
    mentorCtaLabel: 'Find Mentor →',
    videosSubtitle: 'Curated videos to help you understand what this path actually looks like day-to-day.',
    noVideos: 'No curated videos yet — check YouTube for "%stream student life India".',
    outcomesSubtitle: 'Where students who choose %stream typically end up — based on aggregated data.',
    noOutcomes: 'Outcome data not available yet.',
    outcomesDisclaimer: '* Approximate outcomes based on aggregated placement & admission data. Actual results vary.',
    voicesSubtitle: 'What students who went through %stream have to say.',
    noFeedback: 'No student feedback yet for this path.',
    noFeedbackSub: 'Be the first to share your experience — coming soon.',
    loadingFeedback: 'Loading feedback…',
  },

  // ── ExamDetails component ──────────────────────────────────────────────────
  examDetails: {
    sectionTitle: 'Entrance Exams That Matter For You',
    subtitleWithStream: 'Showing exams relevant to your %stream background. Click any to expand.',
    subtitleAll: 'All major entrance exams after Class 12. Click any to expand.',
    eligibilityHeading: '✅ Eligibility',
    pathsAfterHeading: '🚀 Paths After This Exam',
    careerTrackHeading: '🎯 Career Track',
    tipHeading: '💡 Honest Tip',
    disclaimer: 'Exam details are updated regularly. Always verify current eligibility and dates at the official exam website.',
    difficulty: {
      extremelyHigh: 'Extremely High',
      high: 'High',
      moderateToHigh: 'Moderate to High',
      moderate: 'Moderate',
      lowToModerate: 'Low to Moderate',
      drawingSkill: 'Moderate (drawing skill matters)',
    },
  },

  // ── PrintReport page ───────────────────────────────────────────────────────
  printReport: {
    officialMode: '📋 Official Report',
    summaryMode: '💬 Simple Summary',
    printButton: '🖨️ Print / Save PDF',
    backLink: 'Return to Dashboard',
    summaryHint: '📱 Simple Summary is great for WhatsApp sharing or a quick read. Switch to Official for a printable document.',
    loadingText: 'Preparing report…',
    noDataText: 'No guidance report was found to print.',
    noDataCta: 'Back to Dashboard',
    officialTitle: 'Career Guidance Report',
    officialSubtitle: 'Generated dynamically based on honest student assessments',
    class10Label: 'Class 10 Selection',
    class12Label: 'Class 12 Pathway',
    sections: {
      profile: '1. Student Assessment Profile',
      summary: '2. Evaluation Summary',
      pathways: '3. Recommended Pathways',
      roadmap: '4. 4-Year Learning Roadmap',
      mentor: 'Connected Advisor',
      scholarships: 'Matching Scholarships',
    },
    costLabel10: 'Coaching Cost/yr',
    costLabel12: 'Est. Cost/yr',
    disclaimer: 'Verify all costs and deadlines directly with institutions before applying.',
  },

  // ── Onboarding additions ───────────────────────────────────────────────────
  onboarding: {
    streamHint: "It's okay if you're completely undecided — we will help you explore all options.",
    courseRealityPrompt: 'See what this is really like',
    streams: {
      pcm: 'Science (PCM)',
      pcb: 'Science (PCB)',
      pcmb: 'Science (PCMB)',
      commerce: 'Commerce',
      arts: 'Arts / Humanities',
      diploma: 'Diploma / Polytechnic',
      iti: 'ITI / Vocational',
      undecided: 'Undecided',
    },
  },

  // ── Common / shared ────────────────────────────────────────────────────────
  common: {
    backHome: 'Back to Home',
    loading: 'Loading…',
    error: 'Something went wrong',
    retry: 'Try again',
    comingSoon: 'Coming soon',
    learnMore: 'Learn more',
    getStarted: 'Get Started',
  },
}

export default en
