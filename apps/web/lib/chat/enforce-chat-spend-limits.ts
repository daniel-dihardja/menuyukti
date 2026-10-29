/**
 * Per-user daily caps for advisor chat LLM spend (feature=chat).
 * Env: CHAT_DAILY_REQUEST_LIMIT (default 100), CHAT_DAILY_TOKEN_LIMIT (default 500000).
 */

import {
  MY_AI_USAGE_SUMMARY_QUERY,
  type AiUsageBucket,
  type MyAiUsageSummaryData,
} from '@/lib/graphql/queries/ai-usage'
import { graphqlQuery } from '@/lib/graphql/client'

export const DEFAULT_CHAT_DAILY_REQUEST_LIMIT = 100
export const DEFAULT_CHAT_DAILY_TOKEN_LIMIT = 500_000

export type ChatSpendTotals = {
  requestCount: number
  tokenCount: number
}

export type ChatSpendLimitDecision =
  | { ok: true }
  | {
      ok: false
      reason: 'request_limit' | 'token_limit'
      message: string
      totals: ChatSpendTotals
      limits: { requests: number; tokens: number }
    }

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function chatDailyRequestLimit(env: NodeJS.ProcessEnv = process.env): number {
  return parsePositiveInt(env.CHAT_DAILY_REQUEST_LIMIT, DEFAULT_CHAT_DAILY_REQUEST_LIMIT)
}

export function chatDailyTokenLimit(env: NodeJS.ProcessEnv = process.env): number {
  return parsePositiveInt(env.CHAT_DAILY_TOKEN_LIMIT, DEFAULT_CHAT_DAILY_TOKEN_LIMIT)
}

/** UTC calendar day as YYYY-MM-DD. */
export function utcDayString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function sumChatSpendFromBuckets(buckets: AiUsageBucket[]): ChatSpendTotals {
  let requestCount = 0
  let tokenCount = 0
  for (const b of buckets) {
    if (b.feature !== 'chat') continue
    requestCount += b.eventCount ?? 0
    tokenCount += (b.inputTokens ?? 0) + (b.outputTokens ?? 0)
  }
  return { requestCount, tokenCount }
}

export function evaluateChatSpendLimits(
  totals: ChatSpendTotals,
  limits: { requests: number; tokens: number } = {
    requests: chatDailyRequestLimit(),
    tokens: chatDailyTokenLimit(),
  },
): ChatSpendLimitDecision {
  if (totals.requestCount >= limits.requests) {
    return {
      ok: false,
      reason: 'request_limit',
      message: `Daily chat request limit reached (${limits.requests}). Try again tomorrow.`,
      totals,
      limits,
    }
  }
  if (totals.tokenCount >= limits.tokens) {
    return {
      ok: false,
      reason: 'token_limit',
      message: `Daily chat token limit reached (${limits.tokens}). Try again tomorrow.`,
      totals,
      limits,
    }
  }
  return { ok: true }
}

/**
 * Load today's usage and decide. On GraphQL/network failure returns `{ ok: true }`
 * (fail open) so a usage outage does not hard-stop advisor chat.
 */
export async function checkAdvisorChatSpendLimits(userId: string): Promise<ChatSpendLimitDecision> {
  const day = utcDayString()
  const limits = {
    requests: chatDailyRequestLimit(),
    tokens: chatDailyTokenLimit(),
  }
  try {
    const data = await graphqlQuery<MyAiUsageSummaryData>(
      MY_AI_USAGE_SUMMARY_QUERY,
      { startDate: day, endDate: day },
      userId,
    )
    const buckets = data.myAiUsageSummary?.buckets ?? []
    return evaluateChatSpendLimits(sumChatSpendFromBuckets(buckets), limits)
  } catch (err) {
    console.error('[chat-spend-limits] usage query failed; allowing request', {
      userId,
      err: err instanceof Error ? err.message : String(err),
    })
    return { ok: true }
  }
}
