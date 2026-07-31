import 'server-only'

import { z } from 'zod'

const AI_GATEWAY_BASE = 'https://ai-gateway.vercel.sh/v1'
const FETCH_TIMEOUT_MS = 12_000

const reportRowSchema = z
  .object({
    model: z.string().optional(),
    total_cost: z.number().optional(),
    input_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
    request_count: z.number().optional(),
  })
  .passthrough()

const reportResponseSchema = z.object({
  results: z.array(reportRowSchema),
})

export type AiGatewayDateRange = {
  startDate: string
  endDate: string
}

export type ModelUsageRow = {
  model: string
  requestCount: number
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
}

export type ReportOk = {
  ok: true
  rows: ModelUsageRow[]
}

export type ReportErr = {
  ok: false
  code: 'missing_key' | 'http_error' | 'parse_error' | 'forbidden'
  status?: number
}

export type AiGatewayPersonalUsagePayload = {
  dateRange: AiGatewayDateRange
  report: ReportOk | ReportErr
}

function gatewayApiKey(): string | null {
  return process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim() || null
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function defaultReportDateRange(): AiGatewayDateRange {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 30)
  return { startDate: utcYmd(start), endDate: utcYmd(end) }
}

async function gatewayFetch(path: string, apiKey: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(`${AI_GATEWAY_BASE}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(timeout)
  }
}

function aggregateByModel(rows: z.infer<typeof reportRowSchema>[]): ModelUsageRow[] {
  const map = new Map<string, ModelUsageRow>()
  for (const r of rows) {
    const model = r.model?.trim() || '(unknown)'
    const cur =
      map.get(model) ??
      ({
        model,
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCostUsd: 0,
      } satisfies ModelUsageRow)
    cur.requestCount += r.request_count ?? 0
    cur.inputTokens += r.input_tokens ?? 0
    cur.outputTokens += r.output_tokens ?? 0
    cur.totalCostUsd += r.total_cost ?? 0
    map.set(model, cur)
  }
  return [...map.values()].sort((a, b) => b.totalCostUsd - a.totalCostUsd)
}

async function loadPersonalModelReport(
  apiKey: string,
  range: AiGatewayDateRange,
  userId: string,
): Promise<ReportOk | ReportErr> {
  const qs = new URLSearchParams({
    start_date: range.startDate,
    end_date: range.endDate,
    group_by: 'model',
    user_id: userId,
  })
  try {
    const res = await gatewayFetch(`/report?${qs.toString()}`, apiKey)
    if (res.status === 403 || res.status === 401) {
      return { ok: false, code: 'forbidden', status: res.status }
    }
    if (!res.ok) {
      return { ok: false, code: 'http_error', status: res.status }
    }
    const json: unknown = await res.json()
    const parsed = reportResponseSchema.safeParse(json)
    if (!parsed.success) {
      return { ok: false, code: 'parse_error' }
    }
    return { ok: true, rows: aggregateByModel(parsed.data.results) }
  } catch {
    return { ok: false, code: 'http_error' }
  }
}

/** Personal LLM usage for one Clerk user (AI Gateway Custom Reporting). */
export async function loadAiGatewayPersonalUsage(
  userId: string,
): Promise<AiGatewayPersonalUsagePayload> {
  const dateRange = defaultReportDateRange()
  const apiKey = gatewayApiKey()
  if (!apiKey) {
    return {
      dateRange,
      report: { ok: false, code: 'missing_key' },
    }
  }

  const report = await loadPersonalModelReport(apiKey, dateRange, userId)
  return { dateRange, report }
}
