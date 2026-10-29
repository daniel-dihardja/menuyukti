import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CHAT_DAILY_REQUEST_LIMIT,
  DEFAULT_CHAT_DAILY_TOKEN_LIMIT,
  evaluateChatSpendLimits,
  sumChatSpendFromBuckets,
  utcDayString,
} from '@/lib/chat/enforce-chat-spend-limits'

describe('sumChatSpendFromBuckets', () => {
  it('sums only feature=chat buckets', () => {
    const totals = sumChatSpendFromBuckets([
      {
        provider: 'ai_gateway',
        feature: 'chat',
        model: 'gpt',
        units: 1,
        eventCount: 3,
        inputTokens: 100,
        outputTokens: 50,
      },
      {
        provider: 'ai_gateway',
        feature: 'chat',
        model: null,
        units: 1,
        eventCount: 2,
        inputTokens: 10,
        outputTokens: 5,
      },
      {
        provider: 'leonardo',
        feature: 'image',
        model: null,
        units: 9,
        eventCount: 9,
        inputTokens: 999,
        outputTokens: 999,
      },
    ])
    expect(totals).toEqual({ requestCount: 5, tokenCount: 165 })
  })
})

describe('evaluateChatSpendLimits', () => {
  const limits = { requests: 10, tokens: 1000 }

  it('allows under limit', () => {
    expect(evaluateChatSpendLimits({ requestCount: 9, tokenCount: 999 }, limits)).toEqual({
      ok: true,
    })
  })

  it('blocks at request limit', () => {
    const d = evaluateChatSpendLimits({ requestCount: 10, tokenCount: 0 }, limits)
    expect(d.ok).toBe(false)
    if (!d.ok) {
      expect(d.reason).toBe('request_limit')
      expect(d.message).toContain('request limit')
    }
  })

  it('blocks at token limit', () => {
    const d = evaluateChatSpendLimits({ requestCount: 1, tokenCount: 1000 }, limits)
    expect(d.ok).toBe(false)
    if (!d.ok) {
      expect(d.reason).toBe('token_limit')
      expect(d.message).toContain('token limit')
    }
  })

  it('uses documented defaults when env unset', () => {
    const d = evaluateChatSpendLimits({
      requestCount: DEFAULT_CHAT_DAILY_REQUEST_LIMIT,
      tokenCount: 0,
    })
    expect(d.ok).toBe(false)
    if (!d.ok) {
      expect(d.limits.requests).toBe(DEFAULT_CHAT_DAILY_REQUEST_LIMIT)
      expect(d.limits.tokens).toBe(DEFAULT_CHAT_DAILY_TOKEN_LIMIT)
    }
  })
})

describe('utcDayString', () => {
  it('returns YYYY-MM-DD in UTC', () => {
    expect(utcDayString(new Date('2026-10-28T23:30:00.000Z'))).toBe('2026-10-28')
  })
})
