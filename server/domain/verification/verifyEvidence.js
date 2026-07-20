function isOfficialLike(record) {
  return Boolean(record?.source_url) && Boolean(record?.verified_at || record?.last_checked_at)
}

export function verifyEvidence({ colleges = [], scholarships = [], feePlans = [] } = {}) {
  const collegeOfficial = colleges.filter(isOfficialLike).length
  const scholarshipOfficial = scholarships.filter(isOfficialLike).length
  const feeOfficial = feePlans.filter(plan => plan?.evidence?.complete).length
  const officialSources = collegeOfficial + scholarshipOfficial + feeOfficial

  return {
    counts: {
      colleges: colleges.length,
      scholarships: scholarships.length,
      feeSchedules: feePlans.length,
      officialSources,
    },
    publishable: officialSources > 0,
    limitations: [
      ...(colleges.length > collegeOfficial ? ['Some college records lack current-cycle verification.'] : []),
      ...(scholarships.length > scholarshipOfficial ? ['Some scholarship records lack a current official verification date.'] : []),
      ...(feePlans.length === 0 ? ['No component-level fee schedule is available for the selected program.'] : []),
    ],
  }
}

export function enforceGuidanceEvidence(result, { profile, colleges = [], scholarships = [] }) {
  const allowedColleges = new Set(colleges.map(item => item.name))
  const allowedScholarships = new Set(scholarships.map(item => item.name))
  const class12 = profile.classLevel !== 'class10'
  let removedCollegeClaims = 0

  const options = result.options.map(option => {
    if (!class12) return option
    const filtered = option.realistic_colleges.filter(name => allowedColleges.has(name))
    removedCollegeClaims += option.realistic_colleges.length - filtered.length
    return { ...option, realistic_colleges: filtered }
  })

  const scholarship = allowedScholarships.has(result.scholarship_to_check)
    ? result.scholarship_to_check
    : ''

  return {
    result: {
      ...result,
      options,
      scholarship_to_check: scholarship,
    },
    guardrail: {
      removedUnsupportedCollegeClaims: removedCollegeClaims,
      removedUnsupportedScholarshipClaim: Boolean(result.scholarship_to_check && !scholarship),
    },
  }
}
