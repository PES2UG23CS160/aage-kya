import { z } from 'zod'

const NonEmptyText = z.string().trim().min(1)
const TextList = z.array(NonEmptyText).default([])

export const GuidanceOptionSchema = z.object({
  path: NonEmptyText,
  honest_take: NonEmptyText,
  requires_entrance_exam: z.string().trim().default('Not established'),
  realistic_colleges: TextList,
  avg_yearly_cost: z.string().trim().default('Insufficient verified fee data'),
  opens_doors_to: TextList,
  watch_out_for: z.string().trim().default(''),
  backup_plan: z.string().trim().default(''),
}).passthrough()

export const GuidanceResponseSchema = z.object({
  summary: NonEmptyText,
  options: z.array(GuidanceOptionSchema).min(1).max(6),
  scholarship_to_check: z.string().trim().default(''),
  one_thing_to_do_this_week: z.string().trim().default(''),
}).passthrough()

export const RoadmapYearSchema = z.object({
  year: z.coerce.number().int().min(1).max(8),
  focus: NonEmptyText,
  skills: TextList,
  certifications: TextList,
  internships_projects: TextList,
  milestones: TextList,
}).passthrough()

export const RoadmapResponseSchema = z.object({
  career_path: NonEmptyText,
  overview: NonEmptyText,
  years: z.array(RoadmapYearSchema).min(1).max(8),
}).passthrough()

export const NormalizedStudentProfileSchema = z.object({
  classLevel: z.enum(['class10', 'class12']).default('class12'),
  fullName: z.string().trim().default(''),
  state: z.string().trim().default(''),
  district: z.string().trim().default(''),
  board: z.string().trim().default(''),
  stream: z.string().trim().default(''),
  marks: z.number().min(0).max(100).nullable(),
  rank: z.number().int().positive().nullable(),
  percentile: z.number().min(0).max(100).nullable(),
  reservationCategory: z.string().trim().default(''),
  domicile: z.string().trim().default(''),
  gender: z.string().trim().default(''),
  disability: z.boolean().nullable(),
  minorityCommunity: z.string().trim().default(''),
  familyIncomeAnnual: z.number().nonnegative().nullable(),
  incomeRange: z.string().trim().default(''),
  budgetAnnual: z.number().nonnegative().nullable(),
  preferredCourse: z.string().trim().default(''),
  preferredState: z.string().trim().default(''),
  preferredCities: z.array(z.string().trim()).default([]),
  hostelRequired: z.boolean().nullable(),
  firstGenCollege: z.boolean().nullable(),
  interests: z.array(z.string().trim()).default([]),
  careerGoals: z.array(z.string().trim()).default([]),
  biggestFear: z.string().trim().default(''),
  riskComfort: z.string().trim().default(''),
  coachingAccess: z.boolean().nullable(),
  completeness: z.object({
    score: z.number().int().min(0).max(100),
    missing: z.array(z.string()),
  }),
})

export const AgentStepSchema = z.object({
  agent: NonEmptyText,
  status: z.enum(['completed', 'degraded', 'skipped', 'failed']),
  durationMs: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative().default(0),
  message: z.string().default(''),
})

export const AgentTraceSchema = z.object({
  orchestrationVersion: NonEmptyText,
  runId: z.string().uuid(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  steps: z.array(AgentStepSchema),
  evidenceCoverage: z.object({
    colleges: z.number().int().nonnegative(),
    scholarships: z.number().int().nonnegative(),
    feeSchedules: z.number().int().nonnegative(),
    officialSources: z.number().int().nonnegative(),
  }),
})
