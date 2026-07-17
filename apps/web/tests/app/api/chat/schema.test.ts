import { describe, expect, it } from 'vitest'

import { chatRequestBodySchema } from '@/app/api/chat/schema'
import { WORKFLOW_VISUALIZATION_ID_VALUES } from '@/lib/workflow/workflow-visualization-ids'

const VALID_MEDIA = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp'

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

  it('accepts referencedMediaNames with safe photo filenames', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'Look' }] }],
      workflowId: '1',
      referencedMediaNames: [VALID_MEDIA],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.referencedMediaNames).toEqual([VALID_MEDIA])
    }
  })

  it('rejects unsafe media filenames', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      referencedMediaNames: ['../secret.png'],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects more than 4 media names', () => {
    const names = Array.from(
      { length: 5 },
      (_, i) => `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee${i}.webp`,
    )
    // Fix UUID format - last digit only changes one char; need valid UUID hex
    const validNames = [
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee0.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee2.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee3.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee4.webp',
    ]
    void names
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      referencedMediaNames: validNames,
    })
    expect(parsed.success).toBe(false)
  })
})
