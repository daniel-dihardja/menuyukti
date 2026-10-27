import { describe, expect, it } from 'vitest'

import { isLanguageMenuLocale, LANGUAGE_MENU_LOCALES } from '@/lib/locale-preference'

describe('locale-preference', () => {
  it('exposes EN and ID for the account menu', () => {
    expect(LANGUAGE_MENU_LOCALES).toEqual(['en', 'id'])
  })

  it('isLanguageMenuLocale accepts only menu locales', () => {
    expect(isLanguageMenuLocale('en')).toBe(true)
    expect(isLanguageMenuLocale('id')).toBe(true)
    expect(isLanguageMenuLocale('de')).toBe(false)
    expect(isLanguageMenuLocale('fr')).toBe(false)
  })
})
