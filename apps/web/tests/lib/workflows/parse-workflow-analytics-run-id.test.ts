import { describe, expect, it } from 'vitest'

import { parseWorkflowAnalyticsRunId } from '@/lib/workflows/parse-workflow-analytics-run-id'

describe('parseWorkflowAnalyticsRunId', () => {
  it('returns numeric analyticsRunId', () => {
    expect(parseWorkflowAnalyticsRunId({ analyticsRunId: 10 })).toBe(10)
  })

  it('coerces string analyticsRunId from legacy workflow data', () => {
    expect(parseWorkflowAnalyticsRunId({ analyticsRunId: '10' })).toBe(10)
  })

  it('returns null when analyticsRunId is missing', () => {
    expect(parseWorkflowAnalyticsRunId({})).toBeNull()
    expect(parseWorkflowAnalyticsRunId(null)).toBeNull()
  })

  it('returns null for invalid values', () => {
    expect(parseWorkflowAnalyticsRunId({ analyticsRunId: 'abc' })).toBeNull()
    expect(parseWorkflowAnalyticsRunId({ analyticsRunId: 0 })).toBeNull()
  })
})
