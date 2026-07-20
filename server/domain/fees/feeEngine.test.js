import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { calculateFeePlan } from './feeEngine.js'

const basePlan = {
  institutionId: 'inst-1',
  institutionName: 'Example Institute',
  courseId: 'course-1',
  courseName: 'Example Programme',
  academicYear: '2026-27',
  durationYears: 2,
  studentContext: { category: 'general', domicile: 'Karnataka', gender: '', hostelRequired: true },
  components: [
    {
      code: 'tuition', label: 'Tuition', category: 'tuition',
      amount: { low: 100000, expected: 120000, high: 140000 },
      recurrence: 'annual', mandatory: true, annualEscalationRate: 0.1,
    },
    {
      code: 'hostel', label: 'Hostel', category: 'hostel',
      amount: { low: 5000, expected: 6000, high: 7000 },
      recurrence: 'monthly', occurrencesPerYear: 10, mandatory: false,
      conditions: { hostelRequired: true },
    },
    {
      code: 'admission', label: 'Admission', category: 'admission',
      amount: { low: 10000, expected: 10000, high: 10000 },
      recurrence: 'one_time', mandatory: true,
    },
  ],
  aid: [
    {
      code: 'confirmed-waiver', label: 'Confirmed waiver',
      amount: { low: 20000, expected: 20000, high: 20000 },
      recurrence: 'annual', status: 'confirmed',
    },
    {
      code: 'possible-scholarship', label: 'Possible scholarship',
      amount: { low: 30000, expected: 30000, high: 30000 },
      recurrence: 'annual', status: 'expected', probability: 0.5,
    },
  ],
}

describe('component-level fee engine', () => {
  test('calculates first-year, complete-course, confirmed-aid, and scenario totals', () => {
    const result = calculateFeePlan(basePlan)
    assert.equal(result.years[0].gross.expected, 190000)
    assert.equal(result.years[0].netConfirmed.expected, 170000)
    assert.equal(result.years[0].netIfExpectedAid.expected, 140000)
    assert.equal(result.years[1].gross.expected, 192000)
    assert.equal(result.totals.netConfirmed.expected, 342000)
    assert.equal(result.totals.scenarios.expected, 342000)
    assert.equal(result.expectedMonthlyBurden, 14250)
    assert.equal(result.evidence.complete, false)
  })

  test('excludes conditional hostel costs when hostel is not required', () => {
    const result = calculateFeePlan({
      ...basePlan,
      studentContext: { ...basePlan.studentContext, hostelRequired: false },
    })
    assert.equal(result.years[0].gross.expected, 130000)
  })

  test('rejects inverted low/expected/high bands', () => {
    assert.throws(() => calculateFeePlan({
      ...basePlan,
      components: [{
        ...basePlan.components[0],
        amount: { low: 200, expected: 100, high: 300 },
      }],
    }), /low <= expected <= high/)
  })
})
