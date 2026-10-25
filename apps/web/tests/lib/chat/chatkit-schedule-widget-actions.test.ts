import { describe, expect, it } from 'vitest'

import { classifyChatKitScheduleWidgetAction } from '@/lib/chat/chatkit-schedule-widget-actions'

const VALID_SCHEDULE = {
  title: 'Week plan',
  summary: 'Busy',
  days: [
    {
      day: 'monday',
      time: '10:00',
      format: 'story',
      menu_items: 'Ramen',
      caption_angle: 'Steam',
      why: 'Lunch peak',
    },
  ],
}

describe('classifyChatKitScheduleWidgetAction', () => {
  it('routes export and share when schedule parses', () => {
    expect(
      classifyChatKitScheduleWidgetAction({
        type: 'schedule.export_ics',
        payload: { schedule: VALID_SCHEDULE },
      }).type,
    ).toBe('schedule.export_ics')
    expect(
      classifyChatKitScheduleWidgetAction({
        type: 'schedule.share',
        payload: { schedule: VALID_SCHEDULE },
      }).type,
    ).toBe('schedule.share')
  })

  it('ignores unknown actions and bad payloads', () => {
    expect(classifyChatKitScheduleWidgetAction({ type: 'story.generate' }).type).toBe('ignored')
    expect(
      classifyChatKitScheduleWidgetAction({
        type: 'schedule.export_ics',
        payload: { schedule: { title: 'x' } },
      }).type,
    ).toBe('ignored')
  })
})
