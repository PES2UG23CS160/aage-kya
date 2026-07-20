import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGuidanceOrchestrator } from './guidanceOrchestrator.js'

test('runs all specialized agents and removes unsupported recommendation claims', async () => {
  const orchestrator = createGuidanceOrchestrator({
    generateRecommendation: async () => ({
      summary: 'A grounded test summary.',
      options: [{
        path: 'Engineering',
        honest_take: 'A realistic test path.',
        requires_entrance_exam: 'JEE Main',
        realistic_colleges: ['Allowed College', 'Hallucinated College'],
        avg_yearly_cost: 'Insufficient verified fee data',
        opens_doors_to: ['Engineer'],
        watch_out_for: 'Competition',
        backup_plan: 'Consider a related programme',
      }],
      scholarship_to_check: 'Unknown Scheme',
      one_thing_to_do_this_week: 'Read the official admission notice.',
    }),
  })

  const output = await orchestrator.run({
    formData: { state: 'Karnataka', board: 'CBSE', stream: 'PCM', marks: 85, incomeRange: '5L-10L', interests: 'engineering' },
    colleges: [{ name: 'Allowed College', state: 'Karnataka', city: 'Mysuru', min_marks: 75, max_marks: 90, yearly_cost_min: 100000, yearly_cost_max: 150000, source_url: 'https://example.edu', verified_at: '2026-07-01' }],
    scholarships: [],
  })

  assert.deepEqual(output.result.options[0].realistic_colleges, ['Allowed College'])
  assert.equal(output.result.scholarship_to_check, '')
  assert.equal(output.context.guardrail.removedUnsupportedCollegeClaims, 1)
  assert.equal(output.trace.steps.length, 9)
  assert.deepEqual(output.trace.steps.map(step => step.agent), [
    'student_profile_agent',
    'competitive_examination_agent',
    'college_recommendation_agent',
    'fee_analysis_agent',
    'scholarship_agent',
    'career_guidance_agent',
    'verification_agent',
    'recommendation_explanation_agent',
    'orchestrator_agent',
  ])
})
