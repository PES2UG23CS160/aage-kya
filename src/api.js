/**
 * Central API helper.
 * In production  → VITE_API_URL points to your deployed backend (Railway/Render)
 * In development → falls back to localhost:5000 (Vite proxy handles it)
 */
const BASE_URL = import.meta.env.VITE_API_URL || ''

async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  return res
}

export async function getHealth() {
  return apiFetch('/api/health')
}

export async function postGuidance(formData, authToken) {
  return apiFetch('/api/guidance', {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: JSON.stringify({ formData }),
  })
}

export async function postRoadmap(formData, option, authToken) {
  return apiFetch('/api/roadmap', {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: JSON.stringify({ formData, option }),
  })
}

export async function getMentors() {
  return apiFetch('/api/mentors')
}

export async function postMentorApply(payload) {
  return apiFetch('/api/mentors/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function postSync(formData, result, authToken) {
  return apiFetch('/api/sync', {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: JSON.stringify({ formData, result }),
  })
}

export async function postTranscribe(audio, mimeType, authToken) {
  return apiFetch('/api/transcribe', {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: JSON.stringify({ audio, mimeType }),
  })
}
