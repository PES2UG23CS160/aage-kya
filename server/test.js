/**
 * Aage Kya? — Express Integration Test Suite
 *
 * Runs endpoints validation, rate limiters checks, and input schema tests.
 * Uses Node's built-in test runner (available in Node 18+).
 *
 * Usage:
 *   cd server
 *   node test.js
 */

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { spawn } from 'node:child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_PORT = 5001
const BASE_URL = `http://localhost:${TEST_PORT}`

let serverProcess

// Start server on port 5001 before running tests
before(async () => {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting test server on port ${TEST_PORT}...`)
    serverProcess = spawn('node', ['index.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: TEST_PORT,
        SUPABASE_URL: '',
        SUPABASE_ANON_KEY: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        GROQ_API_KEY: '',
        ALLOWED_ORIGINS: '',
      }
    })

    let resolved = false
    let startupTimer

    const finish = (callback, value) => {
      if (resolved) return
      resolved = true
      clearTimeout(startupTimer)
      callback(value)
    }

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log(`[Server Stdout]: ${output.trim()}`)
      if (output.includes(`Server listening on port ${TEST_PORT}`)) {
        finish(resolve)
      }
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Stderr]: ${data}`)
    })

    serverProcess.on('error', (err) => {
      finish(reject, err)
    })

    // Timeout safety
    startupTimer = setTimeout(() => {
      finish(reject, new Error('Server start timed out after 10 seconds'))
    }, 10000)
  })
})

// Stop server after tests finish
after(() => {
  if (serverProcess) {
    console.log('🔌 Stopping test server...')
    serverProcess.kill()
  }
})

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Aage Kya? API Integration Tests', () => {

  // 1. Health check
  test('GET /api/health should return status ok', async () => {
    const res = await fetch(`${BASE_URL}/api/health`)
    assert.strictEqual(res.status, 200)
    
    const data = await res.json()
    assert.strictEqual(data.status, 'ok')
    assert.strictEqual(data.mode, 'degraded')
    assert.deepStrictEqual(data.capabilities, { database: false, ai: false, email: false })
  })

  test('GET /api/health/ready should fail closed in degraded mode', async () => {
    const res = await fetch(`${BASE_URL}/api/health/ready`)
    assert.strictEqual(res.status, 503)
    const data = await res.json()
    assert.strictEqual(data.status, 'not_ready')
    assert.deepStrictEqual(data.missing, ['database', 'ai'])
  })

  test('GET /api/predictor/options should not serve prototype data by default', async () => {
    const res = await fetch(`${BASE_URL}/api/predictor/options?exam=JEE`)
    assert.strictEqual(res.status, 503)
    const data = await res.json()
    assert.strictEqual(data.error, 'PREDICTOR_DATA_UNAVAILABLE')
  })

  // 2. Mentors roster
  test('GET /api/mentors should not fabricate mentors when storage is unavailable', async () => {
    const res = await fetch(`${BASE_URL}/api/mentors`)
    assert.strictEqual(res.status, 200)
    
    const data = await res.json()
    assert.ok(Array.isArray(data))
    assert.deepStrictEqual(data, [])
  })

  // 3. Mentors apply endpoint validation
  test('POST /api/mentors/apply should return 400 when missing fields', async () => {
    const res = await fetch(`${BASE_URL}/api/mentors/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul' }) // missing other fields
    })
    
    assert.strictEqual(res.status, 400)
    const data = await res.json()
    assert.strictEqual(data.error, 'BAD_REQUEST')
  })

  // 4. Rate-limiter on volunteer applications (1 per hour)
  test('POST /api/mentors/apply should rate limit on subsequent calls', async () => {
    const validBody = {
      name: 'Test Mentor',
      email: 'test@example.com',
      college: 'Test College',
      degree: 'B.Tech',
      stream: 'PCM to CSE',
      story: 'Test advice.'
    }

    // First request must report that persistence is unavailable, not fake success.
    const res1 = await fetch(`${BASE_URL}/api/mentors/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody)
    })
    assert.strictEqual(res1.status, 503)
    const data1 = await res1.json()
    assert.strictEqual(data1.error, 'APPLICATIONS_UNAVAILABLE')

    // Second request immediately after should be rate limited (429)
    const res2 = await fetch(`${BASE_URL}/api/mentors/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody)
    })
    assert.strictEqual(res2.status, 429)
    const data2 = await res2.json()
    assert.strictEqual(data2.error, 'RATE_LIMIT')
  })

  // 5. Guidance validation
  test('POST /api/guidance should return 400 when missing formData', async () => {
    const res = await fetch(`${BASE_URL}/api/guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.strictEqual(res.status, 400)
  })

  // 6. Roadmap validation
  test('POST /api/roadmap should return 400 when missing formData or option', async () => {
    const res = await fetch(`${BASE_URL}/api/roadmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData: {} }) // missing option
    })
    assert.strictEqual(res.status, 400)
  })

  // 7. Transcribe validation
  test('POST /api/transcribe should return 400 when missing audio data', async () => {
    const res = await fetch(`${BASE_URL}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.strictEqual(res.status, 400)
  })
})
