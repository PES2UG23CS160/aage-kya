import { z } from 'zod'

const MoneyBandSchema = z.object({
  low: z.number().nonnegative(),
  expected: z.number().nonnegative(),
  high: z.number().nonnegative(),
}).superRefine((value, ctx) => {
  if (value.low > value.expected || value.expected > value.high) {
    ctx.addIssue({ code: 'custom', message: 'Money bands must satisfy low <= expected <= high.' })
  }
})

const SourceSchema = z.object({
  url: z.string().url(),
  title: z.string().trim().min(1),
  organisation: z.string().trim().min(1),
  academicYear: z.string().trim().min(4),
  lastCheckedAt: z.string().datetime(),
  verificationStatus: z.enum(['official', 'institution_published', 'government_published', 'estimated', 'historical', 'third_party', 'user_contributed', 'unverified']),
  confidence: z.number().min(0).max(1),
  documentDate: z.string().date().optional(),
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).passthrough()

export const FeeComponentSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
  category: z.enum([
    'tuition', 'admission', 'application', 'registration', 'examination', 'laboratory',
    'library', 'development', 'technology', 'hostel', 'mess', 'transport', 'books',
    'materials', 'uniform', 'equipment', 'laptop', 'deposit', 'internship', 'clinical',
    'field_work', 'industrial_visit', 'placement', 'alumni', 'student_activity',
    'insurance', 'convocation', 'counselling', 'living', 'travel', 'other',
  ]),
  amount: MoneyBandSchema,
  recurrence: z.enum(['one_time', 'annual', 'semester', 'monthly']),
  mandatory: z.boolean(),
  refundable: z.boolean().default(false),
  startYear: z.number().int().min(1).default(1),
  endYear: z.number().int().min(1).optional(),
  occurrencesPerYear: z.number().positive().optional(),
  annualEscalationRate: z.number().min(0).max(1).default(0),
  conditions: z.object({
    studentCategory: z.string().trim().optional(),
    domicile: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    hostelRequired: z.boolean().optional(),
  }).default({}),
  source: SourceSchema.optional(),
  notes: z.string().default(''),
})

export const AidComponentSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
  amount: MoneyBandSchema,
  recurrence: z.enum(['one_time', 'annual', 'semester', 'monthly']),
  status: z.enum(['confirmed', 'expected']),
  probability: z.number().min(0).max(1).optional(),
  startYear: z.number().int().min(1).default(1),
  endYear: z.number().int().min(1).optional(),
  occurrencesPerYear: z.number().positive().optional(),
  source: SourceSchema.optional(),
})

export const FeePlanSchema = z.object({
  id: z.string().trim().min(1).optional(),
  institutionId: z.string().trim().min(1),
  institutionName: z.string().trim().min(1),
  courseId: z.string().trim().min(1),
  courseName: z.string().trim().min(1),
  academicYear: z.string().trim().min(4),
  durationYears: z.number().int().min(1).max(10),
  coverage: z.enum(['semester', 'academic_year', 'complete_course']).default('complete_course'),
  coverageMonths: z.number().int().min(1).max(120).optional(),
  currency: z.literal('INR').default('INR'),
  studentContext: z.object({
    category: z.string().trim().default(''),
    domicile: z.string().trim().default(''),
    gender: z.string().trim().default(''),
    hostelRequired: z.boolean().nullable().default(null),
  }).default({}),
  components: z.array(FeeComponentSchema).min(1),
  aid: z.array(AidComponentSchema).default([]),
  limitations: z.array(z.string().trim().min(1)).default([]),
})

const roundMoney = value => Math.max(0, Math.round(value))

function occurrences(component) {
  if (component.occurrencesPerYear) return component.occurrencesPerYear
  if (component.recurrence === 'semester') return 2
  if (component.recurrence === 'monthly') return 12
  return 1
}

function appliesToYear(component, year) {
  if (year < component.startYear) return false
  if (component.endYear && year > component.endYear) return false
  if (component.recurrence === 'one_time') return year === component.startYear
  return true
}

function contextMatches(conditions, context) {
  if (conditions.studentCategory && conditions.studentCategory !== context.category) return false
  if (conditions.domicile && conditions.domicile !== context.domicile) return false
  if (conditions.gender && conditions.gender !== context.gender) return false
  if (typeof conditions.hostelRequired === 'boolean' && conditions.hostelRequired !== context.hostelRequired) return false
  return true
}

function annualBand(component, year) {
  const multiplier = occurrences(component)
  const escalation = Math.pow(1 + (component.annualEscalationRate || 0), year - component.startYear)
  return {
    low: roundMoney(component.amount.low * multiplier * escalation),
    expected: roundMoney(component.amount.expected * multiplier * escalation),
    high: roundMoney(component.amount.high * multiplier * escalation),
  }
}

function addBand(target, band) {
  target.low += band.low
  target.expected += band.expected
  target.high += band.high
}

function subtractFloor(value, deduction) {
  return {
    low: roundMoney(value.low - deduction.high),
    expected: roundMoney(value.expected - deduction.expected),
    high: roundMoney(value.high - deduction.low),
  }
}

export function calculateFeePlan(input) {
  const plan = FeePlanSchema.parse(input)
  const coverageMonths = plan.coverageMonths || (plan.durationYears * 12)
  const years = []
  const totals = { gross: { low: 0, expected: 0, high: 0 }, confirmedAid: { low: 0, expected: 0, high: 0 }, expectedAid: { low: 0, expected: 0, high: 0 } }
  const missingSources = new Set()

  for (let year = 1; year <= plan.durationYears; year += 1) {
    const gross = { low: 0, expected: 0, high: 0 }
    const confirmedAid = { low: 0, expected: 0, high: 0 }
    const expectedAid = { low: 0, expected: 0, high: 0 }
    const categories = {}
    const componentBreakdown = []
    const aidBreakdown = []

    for (const component of plan.components) {
      if (!appliesToYear(component, year) || !contextMatches(component.conditions, plan.studentContext)) continue
      const band = annualBand(component, year)
      addBand(gross, band)
      categories[component.category] ||= { low: 0, expected: 0, high: 0 }
      addBand(categories[component.category], band)
      componentBreakdown.push({
        code: component.code,
        label: component.label,
        category: component.category,
        amount: band,
        mandatory: component.mandatory,
        refundable: component.refundable,
        source: component.source || null,
        notes: component.notes,
      })
      if (!component.source) missingSources.add(component.code)
    }

    for (const aid of plan.aid) {
      if (!appliesToYear(aid, year)) continue
      const band = annualBand({ ...aid, annualEscalationRate: 0 }, year)
      addBand(aid.status === 'confirmed' ? confirmedAid : expectedAid, band)
      aidBreakdown.push({ code: aid.code, label: aid.label, status: aid.status, amount: band, probability: aid.probability ?? null, source: aid.source || null })
      if (!aid.source) missingSources.add(`aid:${aid.code}`)
    }

    const netConfirmed = subtractFloor(gross, confirmedAid)
    const netIfExpectedAid = subtractFloor(netConfirmed, expectedAid)
    years.push({ year, gross, confirmedAid, expectedAid, netConfirmed, netIfExpectedAid, categories, components: componentBreakdown, aid: aidBreakdown })
    addBand(totals.gross, gross)
    addBand(totals.confirmedAid, confirmedAid)
    addBand(totals.expectedAid, expectedAid)
  }

  const netConfirmed = subtractFloor(totals.gross, totals.confirmedAid)
  const netIfExpectedAid = subtractFloor(netConfirmed, totals.expectedAid)
  const firstYear = years[0]

  return {
    id: plan.id || null,
    institutionId: plan.institutionId,
    institutionName: plan.institutionName,
    courseId: plan.courseId,
    courseName: plan.courseName,
    academicYear: plan.academicYear,
    durationYears: plan.durationYears,
    coverage: plan.coverage,
    coverageMonths,
    currency: plan.currency,
    years,
    totals: {
      ...totals,
      netConfirmed,
      netIfExpectedAid,
      scenarios: {
        bestCase: netIfExpectedAid.low,
        expected: netConfirmed.expected,
        highCost: netConfirmed.high,
      },
    },
    firstYearCashRequirement: firstYear.netConfirmed,
    expectedMonthlyBurden: roundMoney(netConfirmed.expected / coverageMonths),
    limitations: plan.limitations,
    evidence: {
      complete: missingSources.size === 0,
      missingSourceComponents: [...missingSources],
      warning: missingSources.size === 0
        ? ''
        : 'One or more values are assumptions without a linked source and must not be displayed as official fees.',
    },
  }
}
