/**
 * Shared stream constants for the frontend.
 *
 * Single source of truth for all stream value strings used in:
 *   - Onboarding.jsx stream selector
 *   - MentorApplication.jsx stream expertise picker
 *   - QABoard.jsx stream filter
 *   - Any future stream-aware UI component
 *
 * Must stay in sync with server/config/streams.js.
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
