import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeStudentProfile } from '../profile/normalizeStudentProfile.js'
import { rankCandidates } from './rankCandidates.js'

test('ranks transparent academic, budget, location, and evidence factors', () => {
  const profile = normalizeStudentProfile({
    state: 'Karnataka', board: 'CBSE', stream: 'PCM', marks: 85,
    incomeRange: '5L-10L', interests: 'engineering', budgetAnnual: 150000,
  })
  const results = rankCandidates(profile, [
    { name: 'Documented Local College', state: 'Karnataka', city: 'Mysuru', min_marks: 75, max_marks: 90, yearly_cost_min: 90000, yearly_cost_max: 140000, source_url: 'https://example.edu/fees', verified_at: '2026-07-01', admission_cycle: '2026-27' },
    { name: 'Unsupported Expensive College', state: 'Elsewhere', city: 'Far Away', min_marks: 85, max_marks: 95, yearly_cost_min: 500000, yearly_cost_max: 700000 },
  ])
  assert.equal(results[0].candidate.name, 'Documented Local College')
  assert.ok(results[0].score > results[1].score)
  assert.deepEqual(Object.keys(results[0].factors), ['academicFit', 'budgetFit', 'locationFit', 'evidenceFit'])
})
