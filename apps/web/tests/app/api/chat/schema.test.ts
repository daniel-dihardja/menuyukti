import { describe, expect, it } from 'vitest'

import { chatRequestBodySchema } from '@/app/api/chat/schema'
import { WORKFLOW_VISUALIZATION_ID_VALUES } from '@/lib/workflow/workflow-visualization-ids'

describe('chatRequestBodySchema', () => {
  it('accepts visualization reference and analyticsRunId', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      workflowId: '1',
      locationId: '10',
      analyticsRunId: '99',
      referencedVisualizationId: 'pair_lift_matrix_heatmap',
      presetReferenceMilestoneId: '42',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects unknown visualization ids', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      workflowId: '1',
      locationId: '10',
      referencedVisualizationId: 'unknown_chart',
    })
    expect(parsed.success).toBe(false)
  })

  it('matches workflow visualization catalog ids', () => {
    for (const id of WORKFLOW_VISUALIZATION_ID_VALUES) {
      const parsed = chatRequestBodySchema.safeParse({
        messages: [],
        referencedVisualizationId: id,
      })
      expect(parsed.success).toBe(true)
    }
  })
})
