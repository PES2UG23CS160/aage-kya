import { NormalizedStudentProfileSchema } from '../../ai/contracts.js'

const INCOME_MAX = {
  'below_2.5L': 250000,
  '2.5L-5L': 500000,
  '5L-10L': 1000000,
  'above_10L': null,
}

function optionalNumber(value, { integer = false } = {}) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return integer ? Math.trunc(parsed) : parsed
}

function optionalBoolean(value) {
  return typeof value === 'boolean' ? value : null
}

function textList(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (typeof value !== 'string') return []
  return value.split(/[,;\n]/).map(item => item.trim()).filter(Boolean)
}

export function normalizeStudentProfile(input = {}) {
  const preferredCities = textList(input.preferredCities)
  const profile = {
    classLevel: input.classLevel === 'class10' ? 'class10' : 'class12',
    fullName: String(input.fullName || '').trim(),
    state: String(input.state || '').trim(),
    district: String(input.district || '').trim(),
    board: String(input.board || '').trim(),
    stream: String(input.stream || '').trim(),
    marks: optionalNumber(input.marks),
    rank: optionalNumber(input.rank, { integer: true }),
    percentile: optionalNumber(input.percentile),
    reservationCategory: String(input.reservationCategory || input.category || '').trim(),
    domicile: String(input.domicile || input.state || '').trim(),
    gender: String(input.gender || '').trim(),
    disability: optionalBoolean(input.disability),
    minorityCommunity: String(input.minorityCommunity || '').trim(),
    familyIncomeAnnual: optionalNumber(input.familyIncomeAnnual) ?? INCOME_MAX[input.incomeRange] ?? null,
    incomeRange: String(input.incomeRange || '').trim(),
    budgetAnnual: optionalNumber(input.budgetAnnual || input.budget),
    preferredCourse: String(input.preferredCourse || '').trim(),
    preferredState: String(input.preferredState || '').trim(),
    preferredCities,
    hostelRequired: optionalBoolean(input.hostelRequired),
    firstGenCollege: optionalBoolean(input.firstGenCollege),
    interests: textList(input.interests),
    careerGoals: textList(input.careerGoals),
    biggestFear: String(input.biggestFear || '').trim(),
    riskComfort: String(input.riskComfort || '').trim(),
    coachingAccess: optionalBoolean(input.coachingAccess),
  }

  const required = ['state', 'board', 'stream', 'marks', 'incomeRange', 'interests']
  const missing = required.filter(key => {
    const value = profile[key]
    return value === null || value === '' || (Array.isArray(value) && value.length === 0)
  })
  profile.completeness = {
    score: Math.round(((required.length - missing.length) / required.length) * 100),
    missing,
  }

  return NormalizedStudentProfileSchema.parse(profile)
}
