import { describe, expect, it } from 'vitest'

import {
  STORAGE_VERSION,
  decisionFromStored,
  parseStoredConsent,
  serializeConsent,
} from '@/components/cookie-consent/cookie-consent-storage'

describe('cookie consent storage', () => {
  describe('parseStoredConsent', () => {
    it('returns null for missing input', () => {
      expect(parseStoredConsent(null)).toBeNull()
    })

    it('returns null for malformed JSON', () => {
      expect(parseStoredConsent('not-json')).toBeNull()
    })

    it('returns null when version mismatches (forces re-prompt on schema bump)', () => {
      const stale = JSON.stringify({ version: STORAGE_VERSION + 1, analytics: true })
      expect(parseStoredConsent(stale)).toBeNull()
    })

    it('returns null when analytics is missing or wrong type', () => {
      expect(parseStoredConsent(JSON.stringify({ version: STORAGE_VERSION }))).toBeNull()
      expect(
        parseStoredConsent(JSON.stringify({ version: STORAGE_VERSION, analytics: 'yes' })),
      ).toBeNull()
    })

    it('round-trips through serializeConsent', () => {
      expect(parseStoredConsent(serializeConsent(true))).toEqual({
        version: STORAGE_VERSION,
        analytics: true,
      })
      expect(parseStoredConsent(serializeConsent(false))).toEqual({
        version: STORAGE_VERSION,
        analytics: false,
      })
    })
  })

  describe('decisionFromStored', () => {
    it('treats absence as unknown', () => {
      expect(decisionFromStored(null)).toBe('unknown')
    })

    it('maps stored analytics flag to accepted/rejected', () => {
      expect(decisionFromStored({ version: STORAGE_VERSION, analytics: true })).toBe('accepted')
      expect(decisionFromStored({ version: STORAGE_VERSION, analytics: false })).toBe('rejected')
    })
  })
})
