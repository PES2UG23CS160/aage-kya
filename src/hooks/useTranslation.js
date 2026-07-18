/**
 * useTranslation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal i18n hook. Currently hardcoded to English.
 *
 * FUTURE EXTENSION:
 * 1. Replace the hardcoded 'en' with a value from React Context or localStorage:
 *      const lang = useContext(LanguageContext) ?? localStorage.getItem('aageKyaLang') ?? 'en'
 * 2. Add new language files to src/i18n/ (e.g. hi.js, kn.js).
 * 3. Register them in the LANGS map below.
 * 4. All components using `t()` automatically pick up the new language with zero changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import en from '../i18n/en'

const LANGS = {
  en,
  // hi: () => import('../i18n/hi').then(m => m.default),  // lazy-load when needed
}

/**
 * Resolves a dot-notation key against a language object.
 * e.g. resolve(en, 'chatbot.title') → 'Ask Anything'
 *      resolve(en, 'chatbot.nonexistent') → 'chatbot.nonexistent' (key as fallback)
 */
function resolve(langObj, key) {
  return key.split('.').reduce((obj, segment) => {
    if (obj === null || obj === undefined) return undefined
    if (typeof obj !== 'object') return undefined
    return obj[segment]
  }, langObj) ?? key
}

/**
 * useTranslation — returns a translation function `t`.
 *
 * Usage:
 *   const { t, lang } = useTranslation()
 *   t('chatbot.title')            // → "Ask Anything"
 *   t('examDetails.tipHeading')   // → "💡 Honest Tip"
 *
 * String interpolation: Replace %variable placeholders manually after calling t():
 *   t('courseReality.outcomesSubtitle').replace('%stream', streamName)
 */
export function useTranslation() {
  const lang = 'en' // TODO: swap for context/localStorage when multi-lang is activated

  const strings = LANGS[lang] || LANGS['en']

  return {
    /**
     * t(key) — looks up a translation key.
     * Falls back to the raw key string if not found (so missing keys are visible).
     */
    t: (key) => resolve(strings, key),
    /** Currently active language code */
    lang,
    /** Full language display name */
    langName: strings?._meta?.name ?? 'English',
    /** Text direction — 'ltr' or 'rtl' */
    dir: strings?._meta?.direction ?? 'ltr',
  }
}

export default useTranslation
