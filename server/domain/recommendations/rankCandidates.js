const clamp = value => Math.max(0, Math.min(1, value))

function marksFit(profile, candidate) {
  if (profile.marks === null || candidate.min_marks === undefined || candidate.max_marks === undefined) return 0.5
  if (profile.marks >= candidate.min_marks && profile.marks <= candidate.max_marks) return 1
  const distance = profile.marks < candidate.min_marks
    ? candidate.min_marks - profile.marks
    : profile.marks - candidate.max_marks
  return clamp(1 - (distance / 25))
}

function budgetFit(profile, candidate) {
  if (!profile.budgetAnnual) return 0.5
  const low = Number(candidate.yearly_cost_min) || 0
  const high = Number(candidate.yearly_cost_max) || low
  if (!high) return 0.5
  if (high <= profile.budgetAnnual) return 1
  if (low <= profile.budgetAnnual) return 0.7
  return clamp(profile.budgetAnnual / low)
}

function locationFit(profile, candidate) {
  const preferred = new Set([
    profile.state,
    profile.preferredState,
    ...profile.preferredCities,
  ].filter(Boolean).map(value => value.toLowerCase()))
  if (preferred.size === 0) return candidate.national ? 0.7 : 0.5
  if (preferred.has(String(candidate.city || '').toLowerCase())) return 1
  if (preferred.has(String(candidate.state || '').toLowerCase())) return 0.9
  return candidate.national ? 0.65 : 0.3
}

function evidenceFit(candidate) {
  let score = 0
  if (candidate.source_url) score += 0.4
  if (candidate.verified_at) score += 0.4
  if (candidate.admission_cycle) score += 0.2
  return score
}

export const DEFAULT_RECOMMENDATION_WEIGHTS = Object.freeze({
  academicFit: 0.35,
  budgetFit: 0.25,
  locationFit: 0.2,
  evidenceFit: 0.2,
})

export function rankCandidates(profile, candidates = [], weights = DEFAULT_RECOMMENDATION_WEIGHTS) {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0)
  if (Math.abs(totalWeight - 1) > 0.001) throw new Error('Recommendation weights must sum to 1.')

  return candidates
    .map(candidate => {
      const factors = {
        academicFit: marksFit(profile, candidate),
        budgetFit: budgetFit(profile, candidate),
        locationFit: locationFit(profile, candidate),
        evidenceFit: evidenceFit(candidate),
      }
      const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + factors[key] * weight, 0)
      const reasons = []
      if (factors.academicFit >= 0.8) reasons.push('Academic profile is within or close to the recorded range.')
      if (factors.budgetFit >= 0.8) reasons.push('Recorded annual cost is within the stated budget.')
      if (factors.locationFit >= 0.8) reasons.push('Location matches the student preference or domicile.')
      if (factors.evidenceFit < 0.8) reasons.push('Evidence is incomplete; verify the current official admission-cycle source.')
      return {
        candidate,
        score: Math.round(score * 100),
        factors: Object.fromEntries(Object.entries(factors).map(([key, value]) => [key, Math.round(value * 100)])),
        reasons,
      }
    })
    .sort((a, b) => b.score - a.score || String(a.candidate.name).localeCompare(String(b.candidate.name)))
}
