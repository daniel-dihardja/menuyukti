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
      format: 'story',
      menu_items: 'Chef lunch set',
      caption_angle: 'Speed + loyalty nudge',
      why: 'Strong Mon lunch demand index',
    },
    {
      day: 'tuesday',
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
          format: 'post',
          menu_items: '—',
          caption_angle: '—',
          why: '—',
        },
      ],
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
