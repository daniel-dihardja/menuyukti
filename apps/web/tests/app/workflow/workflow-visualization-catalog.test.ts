import { describe, expect, it } from 'vitest'

import {
  WORKFLOW_VISUALIZATION_CATALOG,
  WORKFLOW_VISUALIZATION_IDS,
  addVisualizationId,
  getAvailableCatalogEntries,
  isWorkflowVisualizationId,
  parseStoredVisualizationIds,
  removeVisualizationId,
} from '@/app/(protected)/workflow/_components/workflow-visualization-catalog'
import { WORKFLOW_VISUALIZATION_ID_VALUES } from '@/lib/workflow/workflow-visualization-ids'

describe('workflow-visualization-catalog', () => {
  it('includes venue slot strength, menu item heatmap, and pair lift matrix in the catalog', () => {
    expect(WORKFLOW_VISUALIZATION_CATALOG).toEqual(
      expect.arrayContaining([
        { id: 'venue_slot_strength_heatmap' },
        { id: 'menu_item_heatmap' },
        { id: 'pair_lift_matrix_heatmap' },
      ]),
    )
  })

  it('addVisualizationId avoids duplicates', () => {
    const first = addVisualizationId([], 'venue_slot_strength_heatmap')
    expect(first).toEqual(['venue_slot_strength_heatmap'])

    const second = addVisualizationId(first, 'venue_slot_strength_heatmap')
    expect(second).toEqual(['venue_slot_strength_heatmap'])
    expect(second).toBe(first)
  })

  it('removeVisualizationId drops the matching id', () => {
    expect(
      removeVisualizationId(['venue_slot_strength_heatmap'], 'venue_slot_strength_heatmap'),
    ).toEqual([])
  })

  it('parseStoredVisualizationIds keeps only known ids', () => {
    expect(
      parseStoredVisualizationIds(
        JSON.stringify([
          'venue_slot_strength_heatmap',
          'menu_item_heatmap',
          'pair_lift_matrix_heatmap',
          'unknown_chart',
          42,
        ]),
      ),
    ).toEqual(['venue_slot_strength_heatmap', 'menu_item_heatmap', 'pair_lift_matrix_heatmap'])
  })

  it('parseStoredVisualizationIds returns empty array for invalid json', () => {
    expect(parseStoredVisualizationIds('not-json')).toEqual([])
    expect(parseStoredVisualizationIds(null)).toEqual([])
  })

  it('getAvailableCatalogEntries hides already-added charts', () => {
    expect(getAvailableCatalogEntries([])).toHaveLength(WORKFLOW_VISUALIZATION_CATALOG.length)
    expect(getAvailableCatalogEntries(['venue_slot_strength_heatmap'])).toEqual([
      { id: 'menu_item_heatmap' },
      { id: 'pair_lift_matrix_heatmap' },
    ])
    expect(
      getAvailableCatalogEntries([
        'venue_slot_strength_heatmap',
        'menu_item_heatmap',
        'pair_lift_matrix_heatmap',
      ]),
    ).toEqual([])
  })

  it('isWorkflowVisualizationId validates catalog ids', () => {
    expect(isWorkflowVisualizationId('venue_slot_strength_heatmap')).toBe(true)
    expect(isWorkflowVisualizationId('menu_item_heatmap')).toBe(true)
    expect(isWorkflowVisualizationId('pair_lift_matrix_heatmap')).toBe(true)
    expect(isWorkflowVisualizationId('other')).toBe(false)
  })

  it('keeps catalog ids in sync with shared lib values', () => {
    expect(WORKFLOW_VISUALIZATION_IDS).toEqual([...WORKFLOW_VISUALIZATION_ID_VALUES])
    expect(WORKFLOW_VISUALIZATION_CATALOG.map((entry) => entry.id)).toEqual([
      ...WORKFLOW_VISUALIZATION_ID_VALUES,
    ])
  })
})
