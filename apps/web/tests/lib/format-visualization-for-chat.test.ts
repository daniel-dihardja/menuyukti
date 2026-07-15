import { describe, expect, it } from 'vitest'

import {
  MENU_HEATMAP_CHAT_TOP_N,
  formatVisualizationDataMarkdownSection,
} from '@/lib/chat/format-visualization-for-chat'

describe('formatVisualizationDataMarkdownSection', () => {
  it('formats venue slot strength cells', () => {
    const out = formatVisualizationDataMarkdownSection({
      title: 'Venue slot strength',
      visualizationId: 'venue_slot_strength_heatmap',
      payload: {
        slotDemandProfile: [
          {
            day: 'mon',
            mealPeriod: 'lunch',
            mealPeriodLabel: 'Lunch',
            mealPeriodHoursLabel: '11:00–15:00',
            orderCount: 42,
            trafficShare: 0.2,
            demandIndex: 1.1,
            relativeDemand: 'high',
          },
        ],
      },
    })
    expect(out).toContain('## Visualization data — Venue slot strength')
    expect(out).toContain('mon / Lunch')
    expect(out).toContain('42 orders')
  })

  it('formats pair lift matrix as markdown table', () => {
    const out = formatVisualizationDataMarkdownSection({
      title: 'Pair lift matrix',
      visualizationId: 'pair_lift_matrix_heatmap',
      payload: {
        focusMenus: ['Burger', 'Fries'],
        matrixLift: [
          [null, 1.5],
          [1.2, null],
        ],
        totalOrders: 100,
        multiItemOrderCount: 40,
        scope: 'location',
      },
    })
    expect(out).toContain('| Menu | Burger | Fries |')
    expect(out).toContain('**Total Orders:** 100')
    expect(out).toContain('1.50')
  })

  it('summarizes menu heatmaps and truncates long lists', () => {
    const menuHeatmaps = Array.from({ length: MENU_HEATMAP_CHAT_TOP_N + 5 }, (_, index) => ({
      menu: `Item ${index}`,
      menuCategory: 'Mains',
      menuCategoryDetail: null,
      reportingPeriod: 'week',
      dailyHeatmap: [{ hour: 12, quantity: index + 1 }],
      weeklyHeatmap: [{ day: 'mon', quantity: index + 10 }],
    }))

    const out = formatVisualizationDataMarkdownSection({
      title: 'Menu item heatmap',
      visualizationId: 'menu_item_heatmap',
      payload: {
        menuHeatmaps,
        dailyStartHour: 8,
        dailyEndHour: 22,
      },
    })

    expect(out).toContain('## Visualization data — Menu item heatmap')
    expect(out).toContain('Item 29')
    expect(out).toContain(`top ${MENU_HEATMAP_CHAT_TOP_N} of ${MENU_HEATMAP_CHAT_TOP_N + 5}`)
    expect(out).not.toContain('Item 4')
  })

  it('notes fallback run when usedFallbackRun is true', () => {
    const out = formatVisualizationDataMarkdownSection({
      title: 'Venue slot strength',
      visualizationId: 'venue_slot_strength_heatmap',
      payload: { slotDemandProfile: [] },
      usedFallbackRun: true,
    })
    expect(out).toContain('newer sales report')
  })
})
