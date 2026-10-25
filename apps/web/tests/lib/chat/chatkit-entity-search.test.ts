import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/media/client-api', () => ({
  loadMedia: vi.fn(async () => [
    { name: 'burger.jpg', url: 'https://example.com/b', size: 1, createdAt: '2020-01-01' },
    { name: 'salad.png', url: 'https://example.com/s', size: 1, createdAt: '2020-01-01' },
  ]),
}))

import { searchAdvisorChatKitEntities } from '@/lib/chat/chatkit-entity-search'

describe('searchAdvisorChatKitEntities', () => {
  it('returns matching charts and media', async () => {
    const entities = await searchAdvisorChatKitEntities({
      query: 'menu',
      attachedVisualizationIds: ['menu_item_heatmap', 'low_end_review'],
      visualizationTitles: {
        menu_item_heatmap: 'Menu item heatmap',
        low_end_review: 'Low End review',
      },
      mediaGroupLabel: 'Media',
      chartsGroupLabel: 'Charts',
    })
    expect(entities.some((e) => e.id === 'viz:menu_item_heatmap')).toBe(true)
    expect(entities.every((e) => e.group === 'Charts' || e.group === 'Media')).toBe(true)
  })
})
