import { describe, expect, it } from 'vitest'

import { searchAdvisorChatKitEntities } from '@/lib/chat/chatkit-entity-search'

describe('searchAdvisorChatKitEntities', () => {
  it('returns matching attached visualizations only', async () => {
    const entities = await searchAdvisorChatKitEntities({
      query: 'menu',
      attachedVisualizationIds: ['menu_item_heatmap', 'low_end_review'],
      visualizationTitles: {
        menu_item_heatmap: 'Menu item heatmap',
        low_end_review: 'Weak items review',
      },
      chartsGroupLabel: 'Charts',
    })
    expect(entities).toEqual([
      {
        id: 'viz:menu_item_heatmap',
        title: 'Menu item heatmap',
        group: 'Charts',
        icon: 'chart',
        interactive: true,
        data: { kind: 'visualization', visualizationId: 'menu_item_heatmap' },
      },
    ])
  })

  it('returns no media library entities', async () => {
    const entities = await searchAdvisorChatKitEntities({
      query: '',
      attachedVisualizationIds: ['menu_item_heatmap'],
      visualizationTitles: { menu_item_heatmap: 'Menu item heatmap' },
      chartsGroupLabel: 'Charts',
    })
    expect(entities.every((e) => e.data?.kind === 'visualization')).toBe(true)
    expect(entities.some((e) => e.id.startsWith('media:'))).toBe(false)
  })
})
