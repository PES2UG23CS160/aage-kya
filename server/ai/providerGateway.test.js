import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'zod'
import { AIProviderGateway } from './providerGateway.js'

test('falls back to the next provider and validates structured output', async () => {
  const gateway = new AIProviderGateway({
    maxRetries: 0,
    providers: [
      { name: 'unavailable', generateStructured: async () => Object.assign(Promise.reject(new Error('limited')), { status: 429 }) },
      { name: 'working', generateStructured: async () => ({ data: { answer: 'ok' }, model: 'test-model' }) },
    ],
  })
  const response = await gateway.generateStructured({ prompt: 'test', schema: z.object({ answer: z.literal('ok') }) })
  assert.equal(response.provider, 'working')
  assert.equal(response.failures.length, 1)
})

test('fails closed when no AI provider is configured', async () => {
  const gateway = new AIProviderGateway()
  await assert.rejects(
    gateway.generateStructured({ prompt: 'test', schema: z.any() }),
    error => error.code === 'NO_AI_PROVIDER',
  )
})
