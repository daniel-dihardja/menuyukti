import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadMenuHeatmapsForWorkflow } from '@/lib/analytics/load-menu-heatmaps-for-workflow'

const graphqlQuery = vi.fn()

vi.mock('@/lib/graphql/client', () => ({
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const sampleHeatmaps = [
  {
    menu: 'Burger',
    menuCategory: 'Mains',
    menuCategoryDetail: null,
    reportingPeriod: '2025-01',
    dailyHeatmap: [{ hour: 12, quantity: 5 }],
    weeklyHeatmap: [{ day: 'mon', quantity: 10 }],
  },
]

const sampleMatrixItems = [
  {
    menu: 'Burger',
    quantity: 10,
    totalRevenue: 100,
    cogs: 5,
    totalCogs: 50,
    contributionMargin: 50,
    contributionMarginPercentage: 50,
    marginPerUnit: 5,
    weValue: 1,
    category: 'star',
    action: 'keep',
    menuCategory: 'Mains',
    menuCategoryDetail: null,
  },
]

describe('loadMenuHeatmapsForWorkflow', () => {
  beforeEach(() => {
    graphqlQuery.mockReset()
  })

  it('returns heatmaps from the preferred analytics run', async () => {
    graphqlQuery.mockImplementation(async (_query: string, variables: Record<string, unknown>) => {
      if (variables.analyticsRunId === '42') {
        return {
          analyticsBundle: {
            analyticsRunId: '42',
            menuHeatmaps: sampleHeatmaps,
            menuEngineeringMatrix: { items: sampleMatrixItems },
          },
        }
      }
      if (variables.id === '7') {
        return {
          location: {
            openingHours: [{ dayOfWeek: 'mon', openTime: '09:00', closeTime: '21:00' }],
          },
        }
      }
      return {}
    })

    const result = await loadMenuHeatmapsForWorkflow({
      userId: 'user-1',
      analyticsRunId: 42,
      locationId: 7,
    })

    expect(result.menuHeatmaps).toEqual(sampleHeatmaps)
    expect(result.matrixItems).toEqual(sampleMatrixItems)
    expect(result.analyticsRunId).toBe('42')
    expect(result.usedFallbackRun).toBe(false)
    expect(result.dailyStartHour).toBe(9)
    expect(result.dailyEndHour).toBe(21)
  })

  it('falls back to another run when the preferred run has no heatmaps', async () => {
    graphqlQuery.mockImplementation(async (_query: string, variables: Record<string, unknown>) => {
      if (variables.analyticsRunId === '10') {
        return { analyticsBundle: { menuHeatmaps: [], menuEngineeringMatrix: null } }
      }
      if (variables.locationId === 7 && variables.first === 300) {
        return { analyticsRuns: [{ id: '10' }, { id: '20' }] }
      }
      if (variables.analyticsRunId === '20') {
        return {
          analyticsBundle: {
            menuHeatmaps: sampleHeatmaps,
            menuEngineeringMatrix: null,
          },
        }
      }
      if (variables.id === '7') {
        return { location: { openingHours: [] } }
      }
      return {}
    })

    const result = await loadMenuHeatmapsForWorkflow({
      userId: 'user-1',
      analyticsRunId: 10,
      locationId: 7,
    })

    expect(result.menuHeatmaps).toEqual(sampleHeatmaps)
    expect(result.matrixItems).toBeNull()
    expect(result.analyticsRunId).toBe('20')
    expect(result.usedFallbackRun).toBe(true)
  })

  it('returns empty heatmaps when no run has data', async () => {
    graphqlQuery.mockImplementation(async (_query: string, variables: Record<string, unknown>) => {
      if (variables.analyticsRunId) {
        return { analyticsBundle: { menuHeatmaps: [], menuEngineeringMatrix: null } }
      }
      if (variables.locationId === 7 && variables.first === 300) {
        return { analyticsRuns: [{ id: '10' }] }
      }
      if (variables.id === '7') {
        return { location: { openingHours: [] } }
      }
      return {}
    })

    const result = await loadMenuHeatmapsForWorkflow({
      userId: 'user-1',
      analyticsRunId: 99,
      locationId: 7,
    })

    expect(result.menuHeatmaps).toEqual([])
    expect(result.matrixItems).toBeNull()
    expect(result.analyticsRunId).toBe('99')
    expect(result.usedFallbackRun).toBe(false)
  })
})
