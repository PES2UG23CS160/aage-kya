import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeStudentProfile } from './normalizeStudentProfile.js'

test('normalizes mixed onboarding values and reports missing decision inputs', () => {
  const profile = normalizeStudentProfile({
    classLevel: 'class12',
    state: ' Karnataka ',
    board: 'CBSE',
    stream: 'PCM',
    marks: '84.5',
    incomeRange: '2.5L-5L',
    interests: 'engineering, robotics',
    preferredCities: ['Bengaluru', ' Mysuru '],
    firstGenCollege: true,
  })
  assert.equal(profile.marks, 84.5)
  assert.equal(profile.familyIncomeAnnual, 500000)
  assert.deepEqual(profile.interests, ['engineering', 'robotics'])
  assert.deepEqual(profile.preferredCities, ['Bengaluru', 'Mysuru'])
  assert.equal(profile.completeness.score, 100)
})
