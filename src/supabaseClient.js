import { createClient } from '@supabase/supabase-js'

const configuredUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const configuredAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const isSupabaseConfigured = Boolean(
  /^https?:\/\//.test(configuredUrl) &&
  configuredAnonKey &&
  !/your[-_]/i.test(configuredUrl) &&
  !/your[-_]/i.test(configuredAnonKey)
)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn('[config] Supabase is not configured. Authentication and saved data are unavailable.')
}

// A syntactically valid local endpoint keeps the public SPA renderable during
// setup. It does not simulate auth or persistence; calls fail closed.
const supabaseUrl = isSupabaseConfigured ? configuredUrl : 'http://127.0.0.1:54321'
const supabaseAnonKey = isSupabaseConfigured ? configuredAnonKey : 'local-development-placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
