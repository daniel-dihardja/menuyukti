import { describe, expect, it } from 'vitest'

import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import type { IgMenuPickerMilestoneData } from '@/lib/graphql/node-schemas'
import {
  findPriorIgMenuPickerMilestone,
  resolveIgMenuPickerEntriesForFormat,
} from '@/lib/milestones/ig-format-input'

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

function menuPickerData(
  entries: Array<{ slotKey: string; menu: string }>,
): IgMenuPickerMilestoneData {
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
    })),
    sourceAnalyticsRunId: '42',
    reportingPeriod: '2025-01-01 to 2025-03-31',
  }
}

describe('ig format input helpers', () => {
  it('findPriorIgMenuPickerMilestone returns the nearest upstream menu picker', () => {
    const milestones = [
      milestone('1', 'ig_plan'),
      milestone(
        '2',
        'ig_menu_picker',
        menuPickerData([{ slotKey: 'monday-lunch', menu: 'Pizza' }]),
      ),
      milestone('3', 'ig_format'),
    ]
    expect(findPriorIgMenuPickerMilestone(milestones, '3')?.id).toBe('2')
  })

  it('resolveIgMenuPickerEntriesForFormat skips entries without menu items', () => {
    const milestones = [
      milestone('1', 'ig_menu_picker', {
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
          },
        ],
        sourceAnalyticsRunId: '42',
        reportingPeriod: '2025-01-01 to 2025-03-31',
      } as IgMenuPickerMilestoneData),
      milestone('2', 'ig_format'),
    ]
    const entries = resolveIgMenuPickerEntriesForFormat(milestones, '2')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.slotKey).toBe('tuesday-lunch')
  })
})
