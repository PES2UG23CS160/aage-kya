import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { calculateFeePlan } from '../domain/fees/feeEngine.js'
import { VERIFIED_FEE_PILOT, VERIFIED_FEE_SOURCES } from './verifiedFeePilot.js'

const expectedTotals = {
  'iitb-ug-autumn-2026-open': { gross: 176600, aid: 0, net: 176600 },
  'iitb-ug-autumn-2026-sc-st-pwd': { gross: 76600, aid: 0, net: 76600 },
  'nitk-btech-first-year-2026-open': { gross: 256610, aid: 0, net: 256610 },
  'nitk-btech-first-year-2026-open-low-income': { gross: 256610, aid: 125000, net: 131610 },
  'nitk-btech-first-year-2026-open-middle-income': { gross: 256610, aid: 83333, net: 173277 },
  'nitk-btech-first-year-2026-sc-st-pwd': { gross: 256610, aid: 125000, net: 131610 },
}

describe('reviewed official-source fee pilot', () => {
  test('matches manually reconciled circular totals for every category variant', () => {
    assert.equal(VERIFIED_FEE_PILOT.length, Object.keys(expectedTotals).length)

    for (const plan of VERIFIED_FEE_PILOT) {
      const calculation = calculateFeePlan(plan)
      const expected = expectedTotals[plan.id]
      assert.ok(expected, `Missing expected total for ${plan.id}`)
      assert.equal(calculation.totals.gross.expected, expected.gross)
      assert.equal(calculation.totals.confirmedAid.expected, expected.aid)
      assert.equal(calculation.totals.netConfirmed.expected, expected.net)
      assert.equal(calculation.evidence.complete, true)
      assert.equal(calculation.id, plan.id)
      assert.ok(calculation.limitations.length > 0)
    }
  })

  test('records official source provenance, freshness and immutable checksums', () => {
    assert.equal(VERIFIED_FEE_SOURCES.length, 4)
    for (const source of VERIFIED_FEE_SOURCES) {
      assert.equal(source.verificationStatus, 'official')
      assert.equal(source.confidence, 1)
      assert.match(source.url, /^https:\/\//)
      assert.match(source.contentSha256, /^[a-f0-9]{64}$/)
      assert.match(source.lastCheckedAt, /^2026-07-20T/)
    }
  })
})
