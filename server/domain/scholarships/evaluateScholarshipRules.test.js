import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { evaluateScholarshipRules } from './evaluateScholarshipRules.js'

const profile = {
  familyIncomeAnnual: 300000,
  marks: 82,
  stream: 'PCM',
  state: 'Karnataka',
  domicile: 'Karnataka',
  reservationCategory: 'OBC-NCL',
  gender: 'Female',
  disability: false,
  minorityCommunity: '',
}

describe('deterministic scholarship rules', () => {
  test('returns eligible with traceable reasons when every rule passes', () => {
    const result = evaluateScholarshipRules(profile, {
      incomeMaxAnnual: 500000,
      marksMin: 75,
      eligibleStreams: ['PCM'],
      eligibleStates: ['Karnataka'],
      eligibleGenders: ['Female'],
    })
    assert.equal(result.status, 'eligible')
    assert.equal(result.failures.length, 0)
    assert.ok(result.reasons.length >= 5)
  })

  test('returns not_eligible when a published threshold fails', () => {
    const result = evaluateScholarshipRules(profile, { incomeMaxAnnual: 250000, marksMin: 90 })
    assert.equal(result.status, 'not_eligible')
    assert.equal(result.failures.length, 2)
  })

  test('does not guess a missing eligibility input', () => {
    const result = evaluateScholarshipRules({ ...profile, gender: '', disability: null }, {
      eligibleGenders: ['Female'],
      disabilityRequired: true,
    })
    assert.equal(result.status, 'needs_information')
    assert.deepEqual(result.missingFields.sort(), ['disability', 'gender'])
  })

  test('a failed rule takes precedence over other missing fields', () => {
    const result = evaluateScholarshipRules({ ...profile, familyIncomeAnnual: null, gender: 'Male' }, {
      incomeMaxAnnual: 500000,
      eligibleGenders: ['Female'],
    })
    assert.equal(result.status, 'not_eligible')
    assert.deepEqual(result.missingFields, ['familyIncomeAnnual'])
  })
})
