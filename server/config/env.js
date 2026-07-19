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

export function readEnvironment(source = process.env) {
  const nodeEnv = optionalValue(source.NODE_ENV) || 'development'
  const isProduction = nodeEnv === 'production'
  const port = parsePort(source.PORT)
  const supabaseUrl = optionalValue(source.SUPABASE_URL)
  const supabaseAnonKey = optionalValue(source.SUPABASE_ANON_KEY)
  const rawServiceRoleKey = optionalValue(source.SUPABASE_SERVICE_ROLE_KEY)
  const rawGroqApiKey = optionalValue(source.GROQ_API_KEY)
  const serviceRoleKey = isPlaceholder(rawServiceRoleKey) ? null : rawServiceRoleKey
  const groqApiKey = isPlaceholder(rawGroqApiKey) ? null : rawGroqApiKey
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
  if (publicAppUrl && !isHttpUrl(publicAppUrl)) {
    errors.push('PUBLIC_APP_URL must be an HTTP or HTTPS URL.')
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
    resendApiKey: optionalValue(source.RESEND_API_KEY),
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
