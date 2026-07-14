import { describe, expect, it } from 'vitest'

import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import type { IgFormatMilestoneData } from '@/lib/graphql/node-schemas'
import {
  findPriorIgFormatMilestone,
  resolveIgFormatEntriesForText,
} from '@/lib/milestones/ig-text-input'

function milestone(
  id: string,
  presetId: TimelineMilestone['presetId'],
  data?: TimelineMilestone['data'],
): TimelineMilestone {
  return {
    id,
    title: id,
    presetId,
    data,
    goal: '',
    passCriteria: [],
    milestoneInput: undefined,
    runChatModel: undefined,
    status: 'empty',
  }
}

function formatData(
  entries: Array<{
    slotKey: string
    menu: string
    type?: 'post' | 'reel' | 'story' | 'post-carousel'
  }>,
): IgFormatMilestoneData {
  return {
    scheduleExplanation: 'Weekly cadence',
    entries: entries.map((entry) => ({
      day: 'monday' as const,
      slot: '12:00',
      objective: 'Drive lunch',
      pillar: 'hero' as const,
      mealPeriod: 'lunch',
      productRole: 'star' as const,
      slotStrategy: 'grow' as const,
      slotKey: entry.slotKey,
      menuItems: [{ menu: entry.menu, rationale: 'Top performer.' }],
      type: entry.type ?? 'post',
      formatRationale: 'Static showcase fits weekday lunch.',
    })),
    sourceAnalyticsRunId: '42',
    reportingPeriod: '2025-01-01 to 2025-03-31',
  }
}

describe('ig text input helpers', () => {
  it('findPriorIgFormatMilestone returns the nearest upstream format milestone', () => {
    const milestones = [
      milestone('1', 'ig_menu_picker'),
      milestone('2', 'ig_format', formatData([{ slotKey: 'monday-lunch', menu: 'Pizza' }])),
      milestone('3', 'ig_text'),
    ]
    expect(findPriorIgFormatMilestone(milestones, '3')?.id).toBe('2')
  })

  it('resolveIgFormatEntriesForText skips entries without menu items or type', () => {
    const milestones = [
      milestone('1', 'ig_format', {
        scheduleExplanation: 'Weekly cadence',
        entries: [
          {
            day: 'monday',
            slot: '12:00',
            objective: 'Drive lunch',
            pillar: 'hero',
            mealPeriod: 'lunch',
            productRole: 'star',
            slotStrategy: 'grow',
            slotKey: 'monday-lunch',
            menuItems: [],
            type: 'post',
            formatRationale: 'Invalid row.',
          },
          {
            day: 'tuesday',
            slot: '12:00',
            objective: 'Drive lunch',
            pillar: 'hero',
            mealPeriod: 'lunch',
            productRole: 'star',
            slotStrategy: 'grow',
            slotKey: 'tuesday-lunch',
            menuItems: [{ menu: 'Burger', rationale: 'Strong seller.' }],
            type: 'reel',
            formatRationale: 'Motion-led discovery.',
          },
        ],
        sourceAnalyticsRunId: '42',
        reportingPeriod: '2025-01-01 to 2025-03-31',
      } as IgFormatMilestoneData),
      milestone('2', 'ig_text'),
    ]
    const entries = resolveIgFormatEntriesForText(milestones, '2')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.slotKey).toBe('tuesday-lunch')
    expect(entries[0]?.type).toBe('reel')
  })
})
