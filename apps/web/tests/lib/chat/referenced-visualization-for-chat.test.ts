import { describe, expect, it, vi, beforeEach } from 'vitest'

import { loadReferencedVisualizationForChat } from '@/lib/chat/referenced-visualization-for-chat'

vi.mock('@/lib/graphql/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/queries')>()
  return {
    ...actual,
    parseNodeData: vi.fn((raw: { node?: { nodeType?: string; locationId?: number } | null }) => ({
      node:
        raw.node?.nodeType === 'workflow'
          ? { nodeType: 'workflow', locationId: raw.node.locationId ?? null }
          : null,
    })),
  }
})

vi.mock('@/lib/analytics/load-slot-demand-profile', () => ({
  loadSlotDemandProfileForWorkflow: vi.fn(),
}))

vi.mock('@/lib/analytics/load-menu-heatmaps-for-workflow', () => ({
  loadMenuHeatmapsForWorkflow: vi.fn(),
}))

vi.mock('@/lib/analytics/load-pair-lift-matrix-for-workflow', () => ({
  loadPairLiftMatrixForWorkflow: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/client'
import { loadSlotDemandProfileForWorkflow } from '@/lib/analytics/load-slot-demand-profile'

vi.mock('@/lib/graphql/client', () => ({
  graphqlQuery: vi.fn(),
}))

describe('loadReferencedVisualizationForChat', () => {
  beforeEach(() => {
    vi.mocked(graphqlQuery).mockReset()
    vi.mocked(loadSlotDemandProfileForWorkflow).mockReset()
  })

  it('returns 404 when workflow is missing', async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({ node: null })

    const result = await loadReferencedVisualizationForChat('user-1', {
      workflowId: '1',
      locationId: 10,
      referencedVisualizationId: 'venue_slot_strength_heatmap',
    })

    expect(result).toEqual({ ok: false, status: 404, message: 'Workflow not found' })
  })

  it('loads slot demand profile for venue slot strength', async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({
      node: { nodeType: 'workflow', locationId: 10 },
    })
    vi.mocked(loadSlotDemandProfileForWorkflow).mockResolvedValue({
      slotDemandProfile: [{ day: 'mon' }],
      analyticsRunId: '99',
      usedFallbackRun: false,
    } as Awaited<ReturnType<typeof loadSlotDemandProfileForWorkflow>>)

    const result = await loadReferencedVisualizationForChat('user-1', {
      workflowId: '1',
      locationId: 10,
      referencedVisualizationId: 'venue_slot_strength_heatmap',
      analyticsRunId: 99,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.title).toBe('Venue slot strength')
      expect(result.visualizationId).toBe('venue_slot_strength_heatmap')
      expect(result.payload).toEqual({
        slotDemandProfile: [{ day: 'mon' }],
        analyticsRunId: '99',
      })
    }
    expect(loadSlotDemandProfileForWorkflow).toHaveBeenCalledWith({
      userId: 'user-1',
      locationId: 10,
      analyticsRunId: 99,
    })
  })
})
