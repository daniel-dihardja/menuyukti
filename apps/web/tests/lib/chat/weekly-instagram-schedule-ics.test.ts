import { describe, expect, it } from 'vitest'

import {
  addMinutesToClock,
  buildWeeklyInstagramScheduleIcs,
  escapeIcsText,
  formatIcsLocalDateTime,
  isoDateForWeekday,
  mondayOfWeekContaining,
  parseScheduleClockTime,
  resolveSlotClockTime,
  snapToWeekMondayIso,
  suggestedIcsFilename,
  WEEKLY_INSTAGRAM_SCHEDULE_ICS_FALLBACK_TIME,
} from '@/lib/chat/weekly-instagram-schedule-ics'
import type { WeeklyInstagramScheduleInput } from '@/lib/chat/weekly-instagram-schedule'

const SCHEDULE: WeeklyInstagramScheduleInput = {
  title: 'Week of peak lunch',
  summary: 'Seven slots grounded in venue demand.',
  days: [
    {
      day: 'monday',
      time: '8:00 AM',
      format: 'story',
      menu_items: 'Breakfast set',
      caption_angle: 'Morning rush',
      why: 'Strong breakfast demand',
    },
    {
      day: 'wednesday',
      time: '12:00',
      format: 'post',
      menu_items: 'Burger + fries',
      caption_angle: 'Midweek treat',
      why: 'Top pair-lift combo',
    },
    {
      day: 'friday',
      time: '—',
      format: 'reel',
      menu_items: 'Happy hour',
      caption_angle: 'Weekend kickoff',
      why: 'Fri evening lift',
    },
  ],
}

describe('parseScheduleClockTime', () => {
  it('parses 12h AM/PM times', () => {
    expect(parseScheduleClockTime('8:00 AM')).toEqual({ hour: 8, minute: 0 })
    expect(parseScheduleClockTime('12:00 PM')).toEqual({ hour: 12, minute: 0 })
    expect(parseScheduleClockTime('12:00 AM')).toEqual({ hour: 0, minute: 0 })
    expect(parseScheduleClockTime('11:30pm')).toEqual({ hour: 23, minute: 30 })
  })

  it('parses 24h times', () => {
    expect(parseScheduleClockTime('11:30')).toEqual({ hour: 11, minute: 30 })
    expect(parseScheduleClockTime('9')).toEqual({ hour: 9, minute: 0 })
  })

  it('returns null for placeholders', () => {
    expect(parseScheduleClockTime('—')).toBeNull()
    expect(parseScheduleClockTime('')).toBeNull()
    expect(parseScheduleClockTime('-')).toBeNull()
  })
})

describe('resolveSlotClockTime', () => {
  it('falls back when time is unparseable', () => {
    expect(resolveSlotClockTime('—')).toEqual(WEEKLY_INSTAGRAM_SCHEDULE_ICS_FALLBACK_TIME)
    expect(resolveSlotClockTime('not-a-time')).toEqual(WEEKLY_INSTAGRAM_SCHEDULE_ICS_FALLBACK_TIME)
  })
})

describe('week date mapping', () => {
  it('snaps mid-week dates to Monday', () => {
    // 2026-08-05 is Wednesday
    expect(snapToWeekMondayIso('2026-08-05')).toBe('2026-08-03')
  })

  it('maps weekdays from Monday', () => {
    expect(isoDateForWeekday('2026-08-03', 'monday')).toBe('2026-08-03')
    expect(isoDateForWeekday('2026-08-03', 'wednesday')).toBe('2026-08-05')
    expect(isoDateForWeekday('2026-08-03', 'sunday')).toBe('2026-08-09')
  })

  it('mondayOfWeekContaining handles Sunday', () => {
    const sunday = new Date(2026, 7, 9) // Aug 9 2026 is Sunday
    expect(mondayOfWeekContaining(sunday)).toEqual(new Date(2026, 7, 3))
  })
})

describe('buildWeeklyInstagramScheduleIcs', () => {
  it('builds VEVENT rows with SUMMARY and TZID DTSTART', () => {
    const ics = buildWeeklyInstagramScheduleIcs({
      schedule: SCHEDULE,
      weekOfIso: '2026-08-05',
      timeZone: 'Europe/Berlin',
      recurrence: 'once',
      formatLabels: {
        story: 'Story',
        post: 'Post',
        carousel: 'Carousel',
        reel: 'Reel',
      },
    })

    expect(ics).toBeTruthy()
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('SUMMARY:Story: Breakfast set')
    expect(ics).toContain('SUMMARY:Post: Burger + fries')
    expect(ics).toContain('DTSTART;TZID=Europe/Berlin:20260803T080000')
    expect(ics).toContain('DTEND;TZID=Europe/Berlin:20260803T083000')
    expect(ics).toContain('DTSTART;TZID=Europe/Berlin:20260805T120000')
    // Placeholder time falls back to 10:00
    expect(ics).toContain('DTSTART;TZID=Europe/Berlin:20260807T100000')
    expect(ics).toContain('DESCRIPTION:Caption: Morning rush\\nWhy: Strong breakfast demand')
    expect(ics).not.toContain('RRULE:')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('adds weekly RRULE when recurrence is weekly', () => {
    const ics = buildWeeklyInstagramScheduleIcs({
      schedule: SCHEDULE,
      weekOfIso: '2026-08-03',
      timeZone: 'UTC',
      recurrence: 'weekly',
    })
    expect(ics).toContain('RRULE:FREQ=WEEKLY')
  })

  it('returns null for invalid week date', () => {
    expect(
      buildWeeklyInstagramScheduleIcs({
        schedule: SCHEDULE,
        weekOfIso: 'not-a-date',
        timeZone: 'UTC',
      }),
    ).toBeNull()
  })
})

describe('ics helpers', () => {
  it('escapes text and formats local datetimes', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne')
    expect(formatIcsLocalDateTime('2026-08-03', { hour: 8, minute: 5 })).toBe('20260803T080500')
  })

  it('adds minutes across midnight', () => {
    expect(addMinutesToClock({ hour: 23, minute: 45 }, 30)).toEqual({
      isoDateOffset: 1,
      clock: { hour: 0, minute: 15 },
    })
  })

  it('suggests a filename from the title', () => {
    expect(suggestedIcsFilename('Week of peak lunch')).toBe('week-of-peak-lunch.ics')
    expect(suggestedIcsFilename('   ')).toBe('instagram-plan.ics')
  })
})
