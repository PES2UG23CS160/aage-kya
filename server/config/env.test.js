import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { assertValidEnvironment, readEnvironment } from './env.js'

describe('server environment validation', () => {
  test('allows an explicit degraded mode outside production', () => {
    const config = readEnvironment({ NODE_ENV: 'test', PORT: '5001' })
    assert.equal(config.supabaseConfigured, false)
    assert.equal(config.errors.length, 0)
    assert.ok(config.warnings.length >= 2)
    assert.doesNotThrow(() => assertValidEnvironment(config))
  })

  test('treats unchanged example values as absent rather than invalid credentials', () => {
    const config = readEnvironment({
      NODE_ENV: 'development',
      PORT: '5000',
      GROQ_API_KEY: 'your_groq_api_key_here',
      SUPABASE_URL: 'https://your-project-ref.supabase.co',
      SUPABASE_ANON_KEY: 'your_supabase_anon_key_here',
      SUPABASE_SERVICE_ROLE_KEY: 'your_supabase_service_role_key_here',
    })
    assert.equal(config.supabaseConfigured, false)
    assert.equal(config.serviceRoleKey, null)
    assert.equal(config.groqApiKey, null)
    assert.deepStrictEqual(config.errors, [])
  })

  test('rejects missing production dependencies and origins', () => {
    const config = readEnvironment({ NODE_ENV: 'production', PORT: '5000' })
    assert.ok(config.errors.includes('Supabase is not configured; auth and persistence-dependent endpoints are unavailable.'))
    assert.ok(config.errors.includes('GROQ_API_KEY is not configured; AI and transcription endpoints are unavailable.'))
    assert.ok(config.errors.includes('SUPABASE_SERVICE_ROLE_KEY is required in production for server-managed writes.'))
    assert.ok(config.errors.includes('RESEND_API_KEY is required in production.'))
    assert.ok(config.errors.includes('PUBLIC_APP_URL is required in production.'))
    assert.throws(() => assertValidEnvironment(config), /Invalid server configuration/)
  })

  test('accepts a complete production configuration', () => {
    const config = readEnvironment({
      NODE_ENV: 'production',
      PORT: '5000',
      ALLOWED_ORIGINS: 'https://app.example.org/',
      PUBLIC_APP_URL: 'https://app.example.org',
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_ANON_KEY: 'non-placeholder-anon-token',
      SUPABASE_SERVICE_ROLE_KEY: 'non-placeholder-service-token',
      GROQ_API_KEY: 'non-placeholder-groq-token',
      RESEND_API_KEY: 'non-placeholder-resend-token',
      RESEND_FROM_EMAIL: 'Aage Kya <noreply@example.org>',
    })
    assert.deepStrictEqual(config.allowedOrigins, ['https://app.example.org'])
    assert.equal(config.supabaseConfigured, true)
    assert.doesNotThrow(() => assertValidEnvironment(config))
  })

  test('requires HTTPS origins and public URL in production', () => {
    const config = readEnvironment({
      NODE_ENV: 'production',
      PORT: '5000',
      ALLOWED_ORIGINS: 'http://app.example.org',
      PUBLIC_APP_URL: 'http://app.example.org',
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_ANON_KEY: 'non-placeholder-anon-token',
      SUPABASE_SERVICE_ROLE_KEY: 'non-placeholder-service-token',
      GROQ_API_KEY: 'non-placeholder-groq-token',
      RESEND_API_KEY: 'non-placeholder-resend-token',
      RESEND_FROM_EMAIL: 'noreply@example.org',
    })
    assert.ok(config.errors.includes('Every production ALLOWED_ORIGINS entry must use HTTPS.'))
    assert.ok(config.errors.includes('PUBLIC_APP_URL must use HTTPS in production.'))
  })

  test('rejects an invalid port and orphaned service key', () => {
    const config = readEnvironment({
      NODE_ENV: 'test',
      PORT: '70000',
      SUPABASE_SERVICE_ROLE_KEY: 'non-placeholder-service-token',
    })
    assert.equal(config.errors.length, 2)
  })

  test('validates AI timeout and retry bounds', () => {
    const config = readEnvironment({
      NODE_ENV: 'test',
      AI_TIMEOUT_MS: '100',
      AI_MAX_RETRIES: '9',
    })
    assert.ok(config.errors.includes('AI_TIMEOUT_MS must be an integer between 1000 and 120000.'))
    assert.ok(config.errors.includes('AI_MAX_RETRIES must be an integer between 0 and 3.'))
  })
})
