import { z } from 'zod'

const TextList = z.array(z.string().trim().min(1)).default([])

export const ScholarshipRuleSchema = z.object({
  incomeMaxAnnual: z.number().nonnegative().nullable().default(null),
  marksMin: z.number().min(0).max(100).nullable().default(null),
  eligibleStreams: TextList,
  eligibleStates: TextList,
  eligibleCategories: TextList,
  eligibleGenders: TextList,
  disabilityRequired: z.boolean().nullable().default(null),
  minorityCommunities: TextList,
}).default({})

function normalized(value) {
  return String(value || '').trim().toLocaleLowerCase('en-IN')
}

function accepts(list, value) {
  if (list.length === 0 || list.some(item => normalized(item) === 'all')) return true
  return list.some(item => normalized(item) === normalized(value))
}

function checkList({ values, profileValue, field, label, reasons, failures, missing }) {
  if (values.length === 0 || values.some(item => normalized(item) === 'all')) return
  if (!profileValue) {
    missing.add(field)
  } else if (!accepts(values, profileValue)) {
    failures.push(`${label} is not included in the published eligibility rule.`)
  } else {
    reasons.push(`${label} matches the published rule.`)
  }
}

export function evaluateScholarshipRules(profile, rawRule = {}) {
  const rule = ScholarshipRuleSchema.parse(rawRule)
  const reasons = []
  const failures = []
  const missing = new Set()

  if (rule.incomeMaxAnnual !== null) {
    if (profile.familyIncomeAnnual === null || profile.familyIncomeAnnual === undefined) {
      missing.add('familyIncomeAnnual')
    } else if (profile.familyIncomeAnnual > rule.incomeMaxAnnual) {
      failures.push(`Family income exceeds the published limit of ₹${rule.incomeMaxAnnual.toLocaleString('en-IN')} per year.`)
    } else {
      reasons.push('Family income is within the published limit.')
    }
  }

  if (rule.marksMin !== null) {
    if (profile.marks === null || profile.marks === undefined) {
      missing.add('marks')
    } else if (profile.marks < rule.marksMin) {
      failures.push(`Marks are below the published minimum of ${rule.marksMin}%.`)
    } else {
      reasons.push('Marks meet the published minimum.')
    }
  }

  checkList({ values: rule.eligibleStreams, profileValue: profile.stream, field: 'stream', label: 'Stream', reasons, failures, missing })
  checkList({ values: rule.eligibleStates, profileValue: profile.domicile || profile.state, field: 'domicile', label: 'Domicile', reasons, failures, missing })
  checkList({ values: rule.eligibleCategories, profileValue: profile.reservationCategory, field: 'reservationCategory', label: 'Reservation category', reasons, failures, missing })
  checkList({ values: rule.eligibleGenders, profileValue: profile.gender, field: 'gender', label: 'Gender', reasons, failures, missing })
  checkList({ values: rule.minorityCommunities, profileValue: profile.minorityCommunity, field: 'minorityCommunity', label: 'Minority community', reasons, failures, missing })

  if (rule.disabilityRequired === true) {
    if (profile.disability === null || profile.disability === undefined) {
      missing.add('disability')
    } else if (!profile.disability) {
      failures.push('The published rule requires a disability criterion that is not met.')
    } else {
      reasons.push('The disability criterion is met.')
    }
  }

  const status = failures.length > 0
    ? 'not_eligible'
    : missing.size > 0
      ? 'needs_information'
      : 'eligible'

  return {
    status,
    reasons,
    failures,
    missingFields: [...missing],
    rule,
  }
}

export function legacyScholarshipRule(record) {
  const incomeLakh = Number(record.eligibility_income_max_lakh)
  const incomeMaxAnnual = Number.isFinite(incomeLakh) && incomeLakh < 99 ? incomeLakh * 100000 : null
  const marks = Number(record.eligibility_marks_min)
  return {
    incomeMaxAnnual,
    marksMin: Number.isFinite(marks) && marks > 0 ? marks : null,
    eligibleStreams: record.eligible_streams || [],
    eligibleStates: record.eligible_states || [],
    eligibleCategories: record.eligible_categories || [],
    eligibleGenders: record.eligible_genders || [],
    disabilityRequired: typeof record.disability_required === 'boolean' ? record.disability_required : null,
    minorityCommunities: record.minority_communities || [],
  }
}
