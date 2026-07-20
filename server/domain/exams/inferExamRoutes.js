const ROUTES = {
  pcm: ['JEE Main', 'JEE Advanced', 'State Engineering CET', 'CUET UG'],
  pcb: ['NEET UG', 'CUET UG', 'State Nursing/Allied Health Entrance'],
  pcmb: ['JEE Main', 'NEET UG', 'CUET UG', 'State CET'],
  commerce: ['CUET UG', 'CA Foundation', 'CSEET', 'IPMAT'],
  arts: ['CUET UG', 'CLAT', 'AILET', 'NID DAT'],
  humanities: ['CUET UG', 'CLAT', 'AILET', 'NID DAT'],
  diploma: ['State Polytechnic Entrance', 'Institution-specific admission'],
  vocational: ['State ITI admission', 'Apprenticeship selection'],
}

export function inferExamRoutes(profile) {
  const stream = String(profile.stream || '').toLowerCase()
  const matchedKey = Object.keys(ROUTES).find(key => stream.includes(key))
  const exams = matchedKey ? ROUTES[matchedKey] : ['CUET UG', 'Relevant state or institution entrance examination']
  return {
    exams,
    status: 'discovery_only',
    warning: 'Eligibility, dates, attempt rules, and participating institutions require a current official exam-cycle record.',
  }
}
