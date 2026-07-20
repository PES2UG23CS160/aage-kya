import { randomUUID } from 'node:crypto'
import { AgentTraceSchema } from './contracts.js'
import { normalizeStudentProfile } from '../domain/profile/normalizeStudentProfile.js'
import { inferExamRoutes } from '../domain/exams/inferExamRoutes.js'
import { rankCandidates } from '../domain/recommendations/rankCandidates.js'
import { enforceGuidanceEvidence, verifyEvidence } from '../domain/verification/verifyEvidence.js'
import { evaluateScholarshipRules, legacyScholarshipRule } from '../domain/scholarships/evaluateScholarshipRules.js'

export const GUIDANCE_ORCHESTRATION_VERSION = '2026-07-20.1'

function legacyFeeAnalysis(colleges) {
  return {
    status: 'insufficient_component_data',
    schedules: [],
    legacyRanges: colleges.map(college => ({
      institution: college.name,
      yearlyMin: Number(college.yearly_cost_min) || 0,
      yearlyMax: Number(college.yearly_cost_max) || 0,
      sourceUrl: college.source_url || '',
      warning: 'Legacy annual range; not a component-level verified fee schedule.',
    })),
  }
}

function scholarshipAnalysis(profile, scholarships) {
  const evaluations = scholarships.map(scholarship => ({
    name: scholarship.name,
    sourceUrl: scholarship.source_url || scholarship.application_url || '',
    admissionCycle: scholarship.admission_cycle || '',
    ...evaluateScholarshipRules(profile, scholarship.eligibility_rules || legacyScholarshipRule(scholarship)),
  }))
  const eligibleNames = new Set(evaluations.filter(item => item.status === 'eligible').map(item => item.name))
  const eligibleRecords = scholarships.filter(item => eligibleNames.has(item.name))
  return {
    status: eligibleRecords.length > 0 ? 'eligible_matches_found' : scholarships.length > 0 ? 'no_eligible_match' : 'no_verified_match',
    candidates: evaluations,
    eligibleRecords,
    incomeContext: profile.familyIncomeAnnual,
  }
}

function careerContext(profile) {
  return {
    interests: profile.interests,
    goals: profile.careerGoals,
    constraints: {
      budgetAnnual: profile.budgetAnnual,
      preferredState: profile.preferredState || profile.state,
      hostelRequired: profile.hostelRequired,
      riskComfort: profile.riskComfort,
    },
  }
}

export function createGuidanceOrchestrator({ generateRecommendation }) {
  if (typeof generateRecommendation !== 'function') throw new TypeError('generateRecommendation is required.')

  return {
    async run({ formData, colleges = [], scholarships = [], studentId = null }) {
      const runId = randomUUID()
      const startedAt = new Date().toISOString()
      const orchestrationStarted = Date.now()
      const steps = []
      const context = { formData, colleges, scholarships, studentId }

      const execute = async (agent, fn, evidenceCount = 0) => {
        const started = Date.now()
        try {
          const value = await fn()
          steps.push({ agent, status: 'completed', durationMs: Date.now() - started, evidenceCount, message: '' })
          return value
        } catch (error) {
          steps.push({ agent, status: 'failed', durationMs: Date.now() - started, evidenceCount, message: error.message })
          throw error
        }
      }

      context.profile = await execute('student_profile_agent', () => normalizeStudentProfile(formData))
      context.examRoutes = await execute('competitive_examination_agent', () => inferExamRoutes(context.profile))
      context.rankedColleges = await execute('college_recommendation_agent', () => rankCandidates(context.profile, colleges), colleges.length)
      context.fees = await execute('fee_analysis_agent', () => legacyFeeAnalysis(colleges), 0)
      context.scholarshipMatches = await execute('scholarship_agent', () => scholarshipAnalysis(context.profile, scholarships), scholarships.length)
      context.career = await execute('career_guidance_agent', () => careerContext(context.profile))
      context.verification = await execute('verification_agent', () => verifyEvidence({ colleges, scholarships: context.scholarshipMatches.eligibleRecords, feePlans: context.fees.schedules }), colleges.length + context.scholarshipMatches.eligibleRecords.length)
      const generated = await execute('recommendation_explanation_agent', () => generateRecommendation(context), context.verification.counts.officialSources)
      const guarded = enforceGuidanceEvidence(generated, { ...context, scholarships: context.scholarshipMatches.eligibleRecords })
      context.guardrail = guarded.guardrail
      steps.push({
        agent: 'orchestrator_agent',
        status: 'completed',
        durationMs: Date.now() - orchestrationStarted,
        evidenceCount: context.verification.counts.officialSources,
        message: 'Coordinated dependency order, evidence guardrails, and final response assembly.',
      })

      const completedAt = new Date().toISOString()
      const trace = AgentTraceSchema.parse({
        orchestrationVersion: GUIDANCE_ORCHESTRATION_VERSION,
        runId,
        startedAt,
        completedAt,
        steps,
        evidenceCoverage: context.verification.counts,
      })

      return {
        result: guarded.result,
        trace,
        context: {
          profileCompleteness: context.profile.completeness,
          examRoutes: context.examRoutes,
          rankedColleges: context.rankedColleges.map(item => ({
            name: item.candidate.name,
            score: item.score,
            factors: item.factors,
            reasons: item.reasons,
          })),
          feeAnalysis: context.fees,
          scholarshipAnalysis: {
            status: context.scholarshipMatches.status,
            candidates: context.scholarshipMatches.candidates,
            incomeContext: context.scholarshipMatches.incomeContext,
          },
          verification: context.verification,
          guardrail: context.guardrail,
        },
      }
    },
  }
}
