import { describe, expect, it } from 'vitest'

import {
  CHAT_VISUALIZATION_CATALOG,
  CHAT_VISUALIZATION_IDS,
  addVisualizationId,
  getAvailableCatalogEntries,
  isChatVisualizationId,
  parseStoredCollapsedVisualizationIds,
  parseStoredVisualizationIds,
  removeCollapsedVisualizationId,
  removeVisualizationId,
  setCollapsedVisualizationId,
} from '@/components/chat/visualizations/chat-visualization-catalog'
import {
  CHAT_VISUALIZATION_ID_VALUES,
  CHAT_VISUALIZATION_TITLES,
  HEATMAP_MATRIX_CHAT_CATEGORIES,
  MENU_HEATMAP_CHAT_TOP_N,
} from '@/lib/chat/visualization-contract'

describe('chat-visualization-catalog', () => {
  it('includes venue slot strength, menu item heatmap, pair lift matrix, and weak review in the catalog', () => {
    expect(CHAT_VISUALIZATION_CATALOG).toEqual(
      expect.arrayContaining([
        { id: 'venue_slot_strength_heatmap' },
        { id: 'menu_item_heatmap' },
        { id: 'pair_lift_matrix_heatmap' },
        { id: 'weak_review' },
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
          'weak_review',
          'unknown_chart',
          42,
        ]),
      ),
    ).toEqual([
      'venue_slot_strength_heatmap',
      'menu_item_heatmap',
      'pair_lift_matrix_heatmap',
      'weak_review',
    ])
  })

  it('parseStoredVisualizationIds returns empty array for invalid json', () => {
    expect(parseStoredVisualizationIds('not-json')).toEqual([])
    expect(parseStoredVisualizationIds(null)).toEqual([])
  })

  it('parseStoredCollapsedVisualizationIds keeps only known ids', () => {
    expect(
      parseStoredCollapsedVisualizationIds(
        JSON.stringify(['menu_item_heatmap', 'unknown_chart', 7]),
      ),
    ).toEqual(['menu_item_heatmap'])
    expect(parseStoredCollapsedVisualizationIds('not-json')).toEqual([])
    expect(parseStoredCollapsedVisualizationIds(null)).toEqual([])
  })

  it('setCollapsedVisualizationId adds and removes without duplicates', () => {
    const collapsed = setCollapsedVisualizationId([], 'menu_item_heatmap', true)
    expect(collapsed).toEqual(['menu_item_heatmap'])
    expect(setCollapsedVisualizationId(collapsed, 'menu_item_heatmap', true)).toBe(collapsed)
    expect(setCollapsedVisualizationId(collapsed, 'menu_item_heatmap', false)).toEqual([])
    expect(setCollapsedVisualizationId([], 'menu_item_heatmap', false)).toEqual([])
  })

  it('removeCollapsedVisualizationId drops the matching id', () => {
    expect(
      removeCollapsedVisualizationId(['menu_item_heatmap', 'weak_review'], 'menu_item_heatmap'),
    ).toEqual(['weak_review'])
  })

  it('getAvailableCatalogEntries hides already-added charts', () => {
    expect(getAvailableCatalogEntries([])).toHaveLength(CHAT_VISUALIZATION_CATALOG.length)
    expect(getAvailableCatalogEntries(['venue_slot_strength_heatmap'])).toEqual([
      { id: 'menu_item_heatmap' },
      { id: 'pair_lift_matrix_heatmap' },
      { id: 'weak_review' },
    ])
    expect(
      getAvailableCatalogEntries([
        'venue_slot_strength_heatmap',
        'menu_item_heatmap',
        'pair_lift_matrix_heatmap',
        'weak_review',
      ]),
    ).toEqual([])
  })

  it('isChatVisualizationId validates catalog ids', () => {
    expect(isChatVisualizationId('venue_slot_strength_heatmap')).toBe(true)
    expect(isChatVisualizationId('menu_item_heatmap')).toBe(true)
    expect(isChatVisualizationId('pair_lift_matrix_heatmap')).toBe(true)
    expect(isChatVisualizationId('weak_review')).toBe(true)
    expect(isChatVisualizationId('other')).toBe(false)
  })

  it('keeps catalog ids in sync with shared lib values', () => {
    expect(CHAT_VISUALIZATION_IDS).toEqual([...CHAT_VISUALIZATION_ID_VALUES])
    expect(CHAT_VISUALIZATION_CATALOG.map((entry) => entry.id)).toEqual([
      ...CHAT_VISUALIZATION_ID_VALUES,
    ])
  })

  it('exposes visualization contract constants for LLM chat summaries', () => {
    expect(MENU_HEATMAP_CHAT_TOP_N).toBe(25)
    expect([...HEATMAP_MATRIX_CHAT_CATEGORIES].sort()).toEqual(['plow_horse', 'puzzle', 'star'])
    expect(Object.keys(CHAT_VISUALIZATION_TITLES).sort()).toEqual(
      [...CHAT_VISUALIZATION_ID_VALUES].sort(),
    )
    for (const id of CHAT_VISUALIZATION_ID_VALUES) {
      expect(CHAT_VISUALIZATION_TITLES[id].length).toBeGreaterThan(0)
    }
  })
})
