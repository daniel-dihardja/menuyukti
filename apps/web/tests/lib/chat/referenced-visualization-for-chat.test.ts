import { describe, expect, it, vi, beforeEach } from 'vitest'

import { loadReferencedVisualizationForChat } from '@/lib/chat/referenced-visualization-for-chat'

vi.mock('@/lib/analytics/load-slot-demand-profile', () => ({
  loadSlotDemandProfileForWorkflow: vi.fn(),
}))

vi.mock('@/lib/analytics/load-menu-heatmaps-for-workflow', () => ({
  loadMenuHeatmapsForWorkflow: vi.fn(),
}))

vi.mock('@/lib/analytics/load-pair-lift-matrix-for-workflow', () => ({
  loadPairLiftMatrixForWorkflow: vi.fn(),
}))

import { loadSlotDemandProfileForWorkflow } from '@/lib/analytics/load-slot-demand-profile'

describe('loadReferencedVisualizationForChat', () => {
  beforeEach(() => {
    vi.mocked(loadSlotDemandProfileForWorkflow).mockReset()
  })

  it('returns 400 for invalid locationId', async () => {
    const result = await loadReferencedVisualizationForChat('user-1', {
      locationId: 0,
      referencedVisualizationId: 'venue_slot_strength_heatmap',
    })

    expect(result).toEqual({ ok: false, status: 400, message: 'Invalid locationId' })
  })

  it('loads slot demand profile for venue slot strength', async () => {
    vi.mocked(loadSlotDemandProfileForWorkflow).mockResolvedValue({
      slotDemandProfile: [{ day: 'mon' }],
      analyticsRunId: '99',
      usedFallbackRun: false,
    } as Awaited<ReturnType<typeof loadSlotDemandProfileForWorkflow>>)

    const result = await loadReferencedVisualizationForChat('user-1', {
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
