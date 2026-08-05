import { describe, expect, it } from 'vitest'

import {
  parseWeeklyInstagramScheduleFromToolPart,
  parseWeeklyInstagramScheduleInput,
  weeklyInstagramScheduleInputSchema,
} from '@/lib/chat/weekly-instagram-schedule'

const VALID = {
  title: 'Week of peak lunch',
  summary: 'Seven slots grounded in venue demand.',
  days: [
    {
      day: 'monday',
      time: '11:30',
      format: 'story',
      menu_items: 'Chef lunch set',
      caption_angle: 'Speed + loyalty nudge',
      why: 'Strong Mon lunch demand index',
    },
    {
      day: 'tuesday',
      time: '12:00',
      format: 'post',
      menu_items: 'Burger + fries',
      caption_angle: 'Midweek treat',
      why: 'Top pair-lift combo',
    },
  ],
}

describe('parseWeeklyInstagramScheduleInput', () => {
  it('parses a valid schedule payload', () => {
    expect(parseWeeklyInstagramScheduleInput(VALID)).toEqual(VALID)
  })

  it('keeps multiple entries for the same weekday', () => {
    const dualMonday = {
      title: 'Multi-slot Monday',
      summary: 'Story then feed post',
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
          day: 'monday',
          time: '1:00 PM',
          format: 'post',
          menu_items: 'Lunch special',
          caption_angle: 'Midday feature',
          why: 'Peak lunch slot',
        },
      ],
    }
    expect(parseWeeklyInstagramScheduleInput(dualMonday)).toEqual(dualMonday)
  })

  it('returns null for missing days', () => {
    expect(parseWeeklyInstagramScheduleInput({ title: 'x', summary: 'y' })).toBeNull()
  })

  it('returns null for empty days', () => {
    expect(
      parseWeeklyInstagramScheduleInput({
        title: 'x',
        summary: 'y',
        days: [],
      }),
    ).toBeNull()
  })

  it('drops invalid weekdays but keeps valid days', () => {
    expect(
      parseWeeklyInstagramScheduleInput({
        title: 'Plan',
        summary: 'Summary',
        days: [{ ...VALID.days[0], day: 'moonday' }, VALID.days[1]],
      }),
    ).toEqual({
      title: 'Plan',
      summary: 'Summary',
      days: [VALID.days[1]],
    })
  })

  it('normalizes weekday and format aliases and camelCase keys', () => {
    expect(
      parseWeeklyInstagramScheduleInput({
        title: 'Plan',
        summary: 'Summary',
        days: [
          {
            day: 'Mon',
            postingTime: '11:45 AM',
            format: 'IG Story',
            menuItems: ['A', 'B'],
            captionAngle: 'Angle',
            why: 'Because',
          },
        ],
      }),
    ).toEqual({
      title: 'Plan',
      summary: 'Summary',
      days: [
        {
          day: 'monday',
          time: '11:45 AM',
          format: 'story',
          menu_items: 'A, B',
          caption_angle: 'Angle',
          why: 'Because',
        },
      ],
    })
  })

  it('normalizes German weekday names', () => {
    expect(
      parseWeeklyInstagramScheduleInput({
        title: 'Plan',
        summary: 'Summary',
        days: [
          {
            day: 'Mittwoch',
            time: '12:30',
            format: 'Reel',
            menu_items: 'Soup',
            caption_angle: 'Warm',
            why: 'Peak lunch',
          },
        ],
      })?.days[0]?.day,
    ).toBe('wednesday')
  })

  it('parses stringified days arrays', () => {
    expect(
      parseWeeklyInstagramScheduleInput({
        title: 'Plan',
        summary: 'Summary',
        days: JSON.stringify([VALID.days[0]]),
      }),
    ).toEqual({
      title: 'Plan',
      summary: 'Summary',
      days: [VALID.days[0]],
    })
  })

  it('parses a JSON string payload', () => {
    expect(parseWeeklyInstagramScheduleInput(JSON.stringify(VALID))).toEqual(VALID)
  })

  it('fills empty optional text fields for display', () => {
    expect(
      parseWeeklyInstagramScheduleInput({
        title: 'Plan',
        summary: '',
        days: [
          {
            day: 'friday',
            time: '',
            format: 'post',
            menu_items: '',
            caption_angle: '',
            why: '',
          },
        ],
      }),
    ).toEqual({
      title: 'Plan',
      summary: '—',
      days: [
        {
          day: 'friday',
          time: '—',
          format: 'post',
          menu_items: '—',
          caption_angle: '—',
          why: '—',
        },
      ],
    })
  })

  it('splits a leading clock time out of caption_angle', () => {
    expect(
      parseWeeklyInstagramScheduleInput({
        title: 'Plan',
        summary: 'Summary',
        days: [
          {
            day: 'monday',
            time: '',
            format: 'story',
            menu_items: 'Fritters',
            caption_angle: "8:00 AM — 'Start the week crispy and comforting' breakfast snack run.",
            why: 'Peak breakfast',
          },
        ],
      }),
    ).toEqual({
      title: 'Plan',
      summary: 'Summary',
      days: [
        {
          day: 'monday',
          time: '8:00 AM',
          format: 'story',
          menu_items: 'Fritters',
          caption_angle: "'Start the week crispy and comforting' breakfast snack run.",
          why: 'Peak breakfast',
        },
      ],
    })
  })

  it('strips a duplicated leading time from caption when time is already set', () => {
    expect(
      parseWeeklyInstagramScheduleInput({
        title: 'Plan',
        summary: 'Summary',
        days: [
          {
            day: 'tuesday',
            time: '8:00 AM',
            format: 'post',
            menu_items: 'Coffee',
            caption_angle: '8:00 AM - Morning rush promo',
            why: 'Foot traffic',
          },
        ],
      })?.days[0],
    ).toEqual({
      day: 'tuesday',
      time: '8:00 AM',
      format: 'post',
      menu_items: 'Coffee',
      caption_angle: 'Morning rush promo',
      why: 'Foot traffic',
    })
  })

  it('exposes the zod schema for reuse', () => {
    expect(weeklyInstagramScheduleInputSchema.safeParse(VALID).success).toBe(true)
  })
})

describe('parseWeeklyInstagramScheduleFromToolPart', () => {
  it('prefers tool input over output', () => {
    expect(
      parseWeeklyInstagramScheduleFromToolPart({
        input: VALID,
        output: { ...VALID, title: 'From output' },
      })?.title,
    ).toBe('Week of peak lunch')
  })

  it('falls back to echoed tool output when input is empty', () => {
    expect(
      parseWeeklyInstagramScheduleFromToolPart({
        input: {},
        output: JSON.stringify({ ok: true, ...VALID }),
      }),
    ).toEqual(VALID)
  })

  it('returns null when neither input nor output has a schedule', () => {
    expect(
      parseWeeklyInstagramScheduleFromToolPart({
        input: {},
        output: JSON.stringify({ ok: true, action: 'present_weekly_instagram_schedule' }),
      }),
    ).toBeNull()
  })
})
