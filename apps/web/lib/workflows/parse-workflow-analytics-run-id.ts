import { workflowDataSchema } from '@/lib/graphql/node-schemas/workflow-nodes'

/** Parse workflow `data.analyticsRunId` from legacy string or number JSON. */
export function parseWorkflowAnalyticsRunId(data: unknown): number | null {
  const parsed = workflowDataSchema.safeParse(data)
  if (!parsed.success) return null

  const raw = parsed.data.analyticsRunId
  if (raw === undefined || raw === null) return null

  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw
  }

  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const asNumber = Number(raw)
    return Number.isInteger(asNumber) && asNumber > 0 ? asNumber : null
  }

  return null
}
