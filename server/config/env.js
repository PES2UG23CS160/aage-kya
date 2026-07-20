const PLACEHOLDER_PARTS = ['your-', 'your_', 'example', 'replace-me', 'replace_me', '<', '>']

function optionalValue(value) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

function isPlaceholder(value) {
  if (!value) return true
  const normalized = value.toLowerCase()
  return PLACEHOLDER_PARTS.some(part => normalized.includes(part))
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isEmail(value) {
  if (typeof value !== 'string') return false
  const bracketed = value.match(/<([^<>]+)>$/)
  const address = bracketed ? bracketed[1] : value
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
}

function parseOrigins(value) {
  if (!value) return []
  return value
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

function parsePort(value) {
  const parsed = Number.parseInt(value || '5000', 10)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : null
}

function parseInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null
}

export function readEnvironment(source = process.env) {
  const nodeEnv = optionalValue(source.NODE_ENV) || 'development'
  const isProduction = nodeEnv === 'production'
  const port = parsePort(source.PORT)
  const aiTimeoutMs = parseInteger(source.AI_TIMEOUT_MS, 30000, { min: 1000, max: 120000 })
  const aiMaxRetries = parseInteger(source.AI_MAX_RETRIES, 1, { min: 0, max: 3 })
  const supabaseUrl = optionalValue(source.SUPABASE_URL)
  const supabaseAnonKey = optionalValue(source.SUPABASE_ANON_KEY)
  const rawServiceRoleKey = optionalValue(source.SUPABASE_SERVICE_ROLE_KEY)
  const rawGroqApiKey = optionalValue(source.GROQ_API_KEY)
  const rawResendApiKey = optionalValue(source.RESEND_API_KEY)
  const serviceRoleKey = isPlaceholder(rawServiceRoleKey) ? null : rawServiceRoleKey
  const groqApiKey = isPlaceholder(rawGroqApiKey) ? null : rawGroqApiKey
  const resendApiKey = isPlaceholder(rawResendApiKey) ? null : rawResendApiKey
  const resendFromEmail = optionalValue(source.RESEND_FROM_EMAIL)
  const allowedOrigins = parseOrigins(source.ALLOWED_ORIGINS)
  const configuredAppUrl = optionalValue(source.PUBLIC_APP_URL)?.replace(/\/$/, '') || null
  const publicAppUrl = configuredAppUrl || allowedOrigins[0] || null

  const supabaseConfigured = Boolean(
    isHttpUrl(supabaseUrl) &&
    !isPlaceholder(supabaseUrl) &&
    supabaseAnonKey &&
    !isPlaceholder(supabaseAnonKey)
  )

  const errors = []
  const warnings = []

  if (!port) errors.push('PORT must be an integer between 1 and 65535.')
  if (aiTimeoutMs === null) errors.push('AI_TIMEOUT_MS must be an integer between 1000 and 120000.')
  if (aiMaxRetries === null) errors.push('AI_MAX_RETRIES must be an integer between 0 and 3.')
  if (serviceRoleKey && !supabaseConfigured) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY requires a valid SUPABASE_URL and SUPABASE_ANON_KEY.')
  }

  if (!supabaseConfigured) {
    const message = 'Supabase is not configured; auth and persistence-dependent endpoints are unavailable.'
    if (isProduction) errors.push(message)
    else warnings.push(message)
  }

  if (!groqApiKey) {
    const message = 'GROQ_API_KEY is not configured; AI and transcription endpoints are unavailable.'
    if (isProduction) errors.push(message)
    else warnings.push(message)
  }

  if (isProduction && allowedOrigins.length === 0) {
    errors.push('ALLOWED_ORIGINS is required in production.')
  }
  if (isProduction && allowedOrigins.some(origin => !isHttpsUrl(origin))) {
    errors.push('Every production ALLOWED_ORIGINS entry must use HTTPS.')
  }
  if (isProduction && !serviceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required in production for server-managed writes.')
  }
  if (isProduction && !configuredAppUrl) {
    errors.push('PUBLIC_APP_URL is required in production.')
  }
  if (publicAppUrl && !isHttpUrl(publicAppUrl)) {
    errors.push('PUBLIC_APP_URL must be an HTTP or HTTPS URL.')
  }
  if (isProduction && publicAppUrl && !isHttpsUrl(publicAppUrl)) {
    errors.push('PUBLIC_APP_URL must use HTTPS in production.')
  }
  if (isProduction && !resendApiKey) {
    errors.push('RESEND_API_KEY is required in production.')
  }
  if (isProduction && !isEmail(resendFromEmail)) {
    errors.push('RESEND_FROM_EMAIL must be a valid verified sender in production.')
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    port,
    allowedOrigins,
    supabaseUrl,
    supabaseAnonKey,
    serviceRoleKey,
    supabaseConfigured,
    groqApiKey,
    groqModel: optionalValue(source.GROQ_MODEL) || 'llama-3.3-70b-versatile',
    aiTimeoutMs,
    aiMaxRetries,
    resendApiKey,
    resendFromEmail,
    publicAppUrl,
    enablePrototypeData: source.ENABLE_PROTOTYPE_DATA === 'true' && !isProduction,
    errors,
    warnings,
  })
}

export function assertValidEnvironment(config) {
  if (config.errors.length > 0) {
    throw new Error(`Invalid server configuration:\n- ${config.errors.join('\n- ')}`)
  }
}
