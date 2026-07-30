/** Client-local chat thread registry (no GraphQL/DB session entity). */

export type AgentThreadRecord = {
  id: string
  title: string | null
  locationId: number
  analyticsRunId: number | null
  updatedAt: number
}

const STORAGE_KEY = 'menuyukti.agentThreads.v1'
const UUID_RE = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

export function isAgentThreadId(value: string): boolean {
  return UUID_RE.test(value)
}

function parseRecords(raw: string | null): AgentThreadRecord[] {
  if (raw === null || raw === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: AgentThreadRecord[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      if (typeof row.id !== 'string' || !isAgentThreadId(row.id)) continue
      if (
        typeof row.locationId !== 'number' ||
        !Number.isInteger(row.locationId) ||
        row.locationId < 1
      ) {
        continue
      }
      const analyticsRunId =
        typeof row.analyticsRunId === 'number' && Number.isInteger(row.analyticsRunId)
          ? row.analyticsRunId
          : null
      const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : null
      const updatedAt = typeof row.updatedAt === 'number' ? row.updatedAt : Date.now()
      out.push({ id: row.id, title, locationId: row.locationId, analyticsRunId, updatedAt })
    }
    return out.toSorted((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null
  } catch {
    return false
  }
}

function writeRecords(records: AgentThreadRecord[]): void {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    /* ignore quota / private mode */
  }
}

export function listAgentThreads(): AgentThreadRecord[] {
  if (!canUseStorage()) return []
  try {
    return parseRecords(localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

export function getAgentThread(id: string): AgentThreadRecord | null {
  return listAgentThreads().find((t) => t.id === id) ?? null
}

export function createAgentThread(args: {
  locationId: number
  analyticsRunId?: number | null
  title?: string | null
  id?: string
}): AgentThreadRecord {
  const id = args.id ?? crypto.randomUUID()
  const record: AgentThreadRecord = {
    id,
    title: args.title?.trim() || null,
    locationId: args.locationId,
    analyticsRunId: args.analyticsRunId ?? null,
    updatedAt: Date.now(),
  }
  const next = [record, ...listAgentThreads().filter((t) => t.id !== id)]
  writeRecords(next)
  return record
}

export function touchAgentThread(
  id: string,
  patch?: Partial<Pick<AgentThreadRecord, 'title' | 'locationId' | 'analyticsRunId'>>,
): AgentThreadRecord | null {
  const records = listAgentThreads()
  const idx = records.findIndex((t) => t.id === id)
  if (idx < 0) return null
  const current = records[idx]!
  const updated: AgentThreadRecord = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: Date.now(),
  }
  const next = [updated, ...records.filter((t) => t.id !== id)]
  writeRecords(next)
  return updated
}

export function removeAgentThread(id: string): void {
  writeRecords(listAgentThreads().filter((t) => t.id !== id))
}
