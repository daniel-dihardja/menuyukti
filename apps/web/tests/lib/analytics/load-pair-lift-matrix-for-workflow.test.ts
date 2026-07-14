import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hasLiftMatrixData,
  loadPairLiftMatrixForWorkflow,
} from '@/lib/analytics/load-pair-lift-matrix-for-workflow'

const graphqlQuery = vi.fn()

vi.mock('@/lib/graphql/client', () => ({
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const sampleLiftMatrix = {
  focusMenus: ['Burger', 'Fries'],
  matrixLift: [
    [null, 1.5],
    [1.5, null],
  ],
  totalOrders: 100,
  multiItemOrderCount: 40,
  scope: 'stars',
}

describe('hasLiftMatrixData', () => {
  it('returns true when at least two focus menus exist', () => {
    expect(hasLiftMatrixData(sampleLiftMatrix)).toBe(true)
  })

  it('returns false when focus menus are insufficient', () => {
    expect(hasLiftMatrixData({ ...sampleLiftMatrix, focusMenus: ['Burger'] })).toBe(false)
    expect(hasLiftMatrixData(null)).toBe(false)
  })
})

describe('loadPairLiftMatrixForWorkflow', () => {
  beforeEach(() => {
    graphqlQuery.mockReset()
  })

  it('returns lift matrix from the preferred analytics run', async () => {
    graphqlQuery.mockImplementation(async (_query: string, variables: Record<string, unknown>) => {
      if (variables.id === '42') {
        return { menuCombos: sampleLiftMatrix }
      }
      return {}
    })

    const result = await loadPairLiftMatrixForWorkflow({
      userId: 'user-1',
      analyticsRunId: 42,
      locationId: 7,
    })

    expect(result.focusMenus).toEqual(['Burger', 'Fries'])
    expect(result.matrixLift).toEqual(sampleLiftMatrix.matrixLift)
    expect(result.analyticsRunId).toBe('42')
    expect(result.usedFallbackRun).toBe(false)
  })

  it('falls back to another run when the preferred run has insufficient focus menus', async () => {
    graphqlQuery.mockImplementation(async (_query: string, variables: Record<string, unknown>) => {
      if (variables.id === '10') {
        return { menuCombos: { ...sampleLiftMatrix, focusMenus: ['Burger'] } }
      }
      if (variables.locationId === 7 && variables.first === 300) {
        return { analyticsRuns: [{ id: '10' }, { id: '20' }] }
      }
      if (variables.id === '20') {
        return { menuCombos: sampleLiftMatrix }
      }
      return {}
    })

    const result = await loadPairLiftMatrixForWorkflow({
      userId: 'user-1',
      analyticsRunId: 10,
      locationId: 7,
    })

    expect(result.focusMenus).toEqual(['Burger', 'Fries'])
    expect(result.analyticsRunId).toBe('20')
    expect(result.usedFallbackRun).toBe(true)
  })

  it('returns empty payload when no run has lift matrix data', async () => {
    graphqlQuery.mockImplementation(async (_query: string, variables: Record<string, unknown>) => {
      if (variables.id) {
        return { menuCombos: { ...sampleLiftMatrix, focusMenus: ['Burger'] } }
      }
      if (variables.locationId === 7 && variables.first === 300) {
        return { analyticsRuns: [{ id: '10' }] }
      }
      return {}
    })

    const result = await loadPairLiftMatrixForWorkflow({
      userId: 'user-1',
      analyticsRunId: 99,
      locationId: 7,
    })

    expect(result.focusMenus).toEqual([])
    expect(result.matrixLift).toEqual([])
    expect(result.analyticsRunId).toBe('99')
    expect(result.usedFallbackRun).toBe(false)
  })
})
