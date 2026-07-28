import { crmFetch } from './crmClient'

export type CashbackEntry = {
  id: string
  amount: number
  paymentAmount: number | null
  cashbackPercent: number | null
  label: string | null
  createdAt: string
}

export type CashbackConfig = {
  thresholdAmount: number
  percent: number
}

export type CashbackOverview = {
  balance: number
  entries: CashbackEntry[]
  config: CashbackConfig
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

function parseEntry(value: unknown): CashbackEntry | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || !value.id) return null
  if (typeof value.amount !== 'number' || !Number.isFinite(value.amount)) return null
  if (typeof value.createdAt !== 'string' || !value.createdAt) return null
  const label =
    value.label === null || value.label === undefined
      ? null
      : typeof value.label === 'string'
        ? value.label
        : null
  const paymentAmount = parseOptionalInt(value.paymentAmount)
  const cashbackPercent = parseOptionalInt(value.cashbackPercent)
  // Reject non-null non-numbers for snapshot fields
  if (value.paymentAmount !== null && value.paymentAmount !== undefined && paymentAmount === null) {
    return null
  }
  if (
    value.cashbackPercent !== null &&
    value.cashbackPercent !== undefined &&
    cashbackPercent === null
  ) {
    return null
  }
  return {
    id: value.id,
    amount: value.amount,
    paymentAmount,
    cashbackPercent,
    label,
    createdAt: value.createdAt,
  }
}

function parseOverview(value: unknown): CashbackOverview | null {
  if (!isRecord(value)) return null
  if (typeof value.balance !== 'number' || !Number.isFinite(value.balance)) return null
  if (!Array.isArray(value.entries)) return null
  if (!isRecord(value.config)) return null
  if (
    typeof value.config.thresholdAmount !== 'number' ||
    !Number.isFinite(value.config.thresholdAmount) ||
    typeof value.config.percent !== 'number' ||
    !Number.isFinite(value.config.percent)
  ) {
    return null
  }

  const entries: CashbackEntry[] = []
  for (const item of value.entries) {
    const entry = parseEntry(item)
    if (!entry) return null
    entries.push(entry)
  }

  return {
    balance: value.balance,
    entries,
    config: {
      thresholdAmount: value.config.thresholdAmount,
      percent: value.config.percent,
    },
  }
}

/**
 * Fetch the enrolled customer's cashback balance, history, and app rule.
 */
export async function fetchCashbackOverview(deviceId: string): Promise<CashbackOverview> {
  const response = await crmFetch('/me/cashback', { method: 'GET' }, { deviceId })
  const json = (await response.json().catch(() => ({}))) as unknown

  if (!response.ok) {
    const message =
      isRecord(json) && typeof json.message === 'string' && json.message.trim()
        ? json.message
        : `Cashback request failed (${response.status})`
    throw new Error(message)
  }

  const overview = parseOverview(json)
  if (!overview) {
    throw new Error('Invalid cashback overview response')
  }
  return overview
}
