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
let TEST_PORT = 5001
let BASE_URL = `http://localhost:${TEST_PORT}`

let serverProcess

// Start server on port 5001 before running tests
before(async () => {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting test server...`)
    serverProcess = spawn('node', ['index.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        PORT: TEST_PORT,
        SUPABASE_SERVICE_ROLE_KEY: ''
      }
    })

    let resolved = false

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log(`[Server Stdout]: ${output.trim()}`)
      const match = output.match(/Server listening on port (\d+)/)
      if (match) {
        const detectedPort = parseInt(match[1], 10)
        BASE_URL = `http://localhost:${detectedPort}`
        if (!resolved) {
          resolved = true
          resolve()
        }
      }
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Stderr]: ${data}`)
    })

    serverProcess.on('error', (err) => {
      if (!resolved) {
        resolved = true
        reject(err)
      }
    })

    // Timeout safety
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('Server start timed out after 10 seconds'))
      }
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
    assert.deepStrictEqual(data, { status: 'ok' })
  })

  // 2. Mentors roster
  test('GET /api/mentors should return list of active mentors', async () => {
    const res = await fetch(`${BASE_URL}/api/mentors`)
    assert.strictEqual(res.status, 200)
    
    const data = await res.json()
    assert.ok(Array.isArray(data))
    assert.ok(data.length > 0)
    assert.ok(data[0].hasOwnProperty('name'))
    assert.ok(data[0].hasOwnProperty('cal_link'))
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

    // First request should succeed
    const res1 = await fetch(`${BASE_URL}/api/mentors/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody)
    })
    assert.strictEqual(res1.status, 200)

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
