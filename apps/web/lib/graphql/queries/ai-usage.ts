/** AI usage ledger — Leonardo generations and personal summary. */

export type AiUsageEvent = {
  id: string
  provider: string
  feature: string
  model: string | null
  externalId: string | null
  units: number
  status: string
  createdAt: string
}

export type AiUsageBucket = {
  provider: string
  feature: string
  model: string | null
  units: number
  eventCount: number
  inputTokens?: number
  outputTokens?: number
}

export type AiUsageSummary = {
  startDate: string
  endDate: string
  buckets: AiUsageBucket[]
  totalUnits: number
  recentEvents: AiUsageEvent[]
}

export type RecordAiUsageEventData = {
  recordAiUsageEvent: AiUsageEvent
}

export type MyAiUsageSummaryData = {
  myAiUsageSummary: AiUsageSummary | null
}

export const RECORD_AI_USAGE_EVENT_MUTATION = `
  mutation RecordAiUsageEvent(
    $provider: String!
    $feature: String!
    $status: String!
    $model: String
    $externalId: String
    $units: Int
    $metadata: JSON
  ) {
    recordAiUsageEvent(
      provider: $provider
      feature: $feature
      status: $status
      model: $model
      externalId: $externalId
      units: $units
      metadata: $metadata
    ) {
      id
      provider
      feature
      model
      externalId
      units
      status
      createdAt
    }
  }
`

export const MY_AI_USAGE_SUMMARY_QUERY = `
  query MyAiUsageSummary($startDate: String, $endDate: String) {
    myAiUsageSummary(startDate: $startDate, endDate: $endDate) {
      startDate
      endDate
      totalUnits
      buckets {
        provider
        feature
        model
        units
        eventCount
        inputTokens
        outputTokens
      }
      recentEvents {
        id
        provider
        feature
        model
        externalId
        units
        status
        createdAt
      }
    }
  }
`
