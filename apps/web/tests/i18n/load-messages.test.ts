import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCALE,
  deepMergeMessages,
  isAppLocale,
  resolveAppLocale,
  resolveLocaleFromAcceptLanguage,
  SUPPORTED_LOCALES,
} from '@/i18n/load-messages'

describe('SUPPORTED_LOCALES', () => {
  it('includes en, de, and id', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'de', 'id'])
    expect(DEFAULT_LOCALE).toBe('en')
  })

  it('isAppLocale accepts supported tags only', () => {
    expect(isAppLocale('en')).toBe(true)
    expect(isAppLocale('de')).toBe(true)
    expect(isAppLocale('id')).toBe(true)
    expect(isAppLocale('fr')).toBe(false)
    expect(isAppLocale(null)).toBe(false)
  })
})

describe('resolveLocaleFromAcceptLanguage', () => {
  it('defaults to en when header is missing', () => {
    expect(resolveLocaleFromAcceptLanguage(null)).toBe('en')
    expect(resolveLocaleFromAcceptLanguage('')).toBe('en')
  })

  it('picks id from id and id-* tags', () => {
    expect(resolveLocaleFromAcceptLanguage('id')).toBe('id')
    expect(resolveLocaleFromAcceptLanguage('id-ID,id;q=0.9,en;q=0.8')).toBe('id')
  })

  it('picks de from de tags', () => {
    expect(resolveLocaleFromAcceptLanguage('de-DE,de;q=0.9')).toBe('de')
  })

  it('picks en from en tags', () => {
    expect(resolveLocaleFromAcceptLanguage('en-US,en;q=0.9')).toBe('en')
  })

  it('prefers the first matching supported tag in order', () => {
    expect(resolveLocaleFromAcceptLanguage('fr-FR,id;q=0.8,en;q=0.5')).toBe('id')
  })
})

describe('resolveAppLocale', () => {
  it('prefers a valid cookie over Accept-Language', () => {
    expect(
      resolveAppLocale({
        cookieLocale: 'id',
        acceptLanguage: 'en-US,en;q=0.9',
      }),
    ).toBe('id')
  })

  it('falls back to Accept-Language when cookie is missing or invalid', () => {
    expect(
      resolveAppLocale({
        cookieLocale: null,
        acceptLanguage: 'id-ID',
      }),
    ).toBe('id')
    expect(
      resolveAppLocale({
        cookieLocale: 'fr',
        acceptLanguage: 'de',
      }),
    ).toBe('de')
  })

  it('accepts en cookie explicitly', () => {
    expect(
      resolveAppLocale({
        cookieLocale: 'en',
        acceptLanguage: 'id',
      }),
    ).toBe('en')
  })
})

describe('deepMergeMessages', () => {
  it('overlays nested keys while keeping base siblings', () => {
    const merged = deepMergeMessages(
      { shell: { a: 'A', b: 'B' }, keep: 'yes' },
      { shell: { b: 'B-id' } },
    )
    expect(merged).toEqual({ shell: { a: 'A', b: 'B-id' }, keep: 'yes' })
  })
})
