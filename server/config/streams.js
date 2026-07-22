/**
 * Shared stream constants for the backend.
 *
 * Single source of truth for all stream value strings used in:
 *   - College filtering in runSearchRetrievalAgent
 *   - Seed data (server/seed.js) — comments reference these exact strings
 *   - Scholarship stream eligibility checks
 *
 * Both sides must use these exact strings. Normalisation is handled by
 * normalizeStream() to gracefully handle minor casing / whitespace drift.
 */

/** Canonical stream values exactly as used in seed data and DB */
export const STREAM_VALUES = Object.freeze([
  'Science (PCM)',
  'Science (PCB)',
  'Commerce',
  'Arts / Humanities',
])

/**
 * Normalize a stream string for comparison:
 * trim whitespace, collapse internal runs of whitespace, lowercase.
 * @param {string} s
 * @returns {string}
 */
export function normalizeStream(s) {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Check whether two stream strings refer to the same stream
 * after normalization. Safe against minor casing/whitespace drift.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function streamsMatch(a, b) {
  return normalizeStream(a) === normalizeStream(b)
}
