function timeoutAfter(ms, providerName) {
  return new Promise((_, reject) => {
    const error = new Error(`AI provider ${providerName} timed out after ${ms}ms.`)
    error.code = 'AI_TIMEOUT'
    setTimeout(() => reject(error), ms).unref?.()
  })
}

function isRetryable(error) {
  const status = error?.status || error?.statusCode
  return error?.code === 'AI_TIMEOUT' || status === 408 || status === 409 || status === 429 || status >= 500
}

export class AIProviderGateway {
  constructor({ providers = [], timeoutMs = 30000, maxRetries = 1 } = {}) {
    this.providers = providers.filter(Boolean)
    this.timeoutMs = timeoutMs
    this.maxRetries = maxRetries
  }

  get available() {
    return this.providers.length > 0
  }

  async generateStructured({ prompt, schema, callType = 'unknown', metadata = {} }) {
    if (!this.available) {
      const error = new Error('NO_AI_PROVIDER')
      error.code = 'NO_AI_PROVIDER'
      throw error
    }

    const failures = []
    for (const provider of this.providers) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        const started = Date.now()
        try {
          const response = await Promise.race([
            provider.generateStructured({ prompt, callType, metadata }),
            timeoutAfter(this.timeoutMs, provider.name),
          ])
          const data = schema.parse(response.data)
          return {
            data,
            provider: provider.name,
            model: response.model,
            usage: response.usage || null,
            latencyMs: Date.now() - started,
            attempts: attempt + 1,
            failures,
          }
        } catch (error) {
          failures.push({ provider: provider.name, attempt: attempt + 1, code: error.code || error.status || 'AI_ERROR', message: error.message })
          if (!isRetryable(error) || attempt >= this.maxRetries) break
        }
      }
    }

    const error = new Error('All configured AI providers failed.')
    error.code = 'AI_PROVIDERS_FAILED'
    error.failures = failures
    throw error
  }
}
