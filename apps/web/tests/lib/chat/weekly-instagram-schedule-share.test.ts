import { afterEach, describe, expect, it, vi } from 'vitest'

import type { WeeklyInstagramScheduleInput } from '@/lib/chat/weekly-instagram-schedule'
import {
  formatWeeklyInstagramScheduleShareText,
  ShareCancelledError,
  shareOrCopyText,
  type WeeklyInstagramScheduleShareLabels,
} from '@/lib/chat/weekly-instagram-schedule-share'

const LABELS: WeeklyInstagramScheduleShareLabels = {
  weekdays: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  },
  formats: {
    story: 'Story',
    post: 'Post',
    carousel: 'Carousel',
    reel: 'Reel',
  },
  captionLabel: 'Caption',
  whyLabel: 'Why',
}

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
      day: 'tuesday',
      time: '12:00',
      format: 'post',
      menu_items: 'Burger + fries',
      caption_angle: '—',
      why: '—',
    },
    {
      day: 'friday',
      time: '6:00 PM',
      format: 'reel',
      menu_items: 'Happy hour',
      caption_angle: 'Weekend kickoff',
      why: 'Fri evening lift',
    },
  ],
}

describe('formatWeeklyInstagramScheduleShareText', () => {
  it('formats title, summary, and slot lines in order', () => {
    const text = formatWeeklyInstagramScheduleShareText(SCHEDULE, LABELS)
    expect(text).toBe(
      [
        'Week of peak lunch',
        'Seven slots grounded in venue demand.',
        '',
        'Monday · Story · 8:00 AM — Breakfast set',
        '  Caption: Morning rush',
        '  Why: Strong breakfast demand',
        'Tuesday · Post · 12:00 — Burger + fries',
        'Friday · Reel · 6:00 PM — Happy hour',
        '  Caption: Weekend kickoff',
        '  Why: Fri evening lift',
        '',
      ].join('\n'),
    )
  })

  it('omits caption and why when placeholders', () => {
    const text = formatWeeklyInstagramScheduleShareText(
      {
        title: 'Sparse',
        summary: 'Only menus',
        days: [
          {
            day: 'wednesday',
            time: '11:30',
            format: 'carousel',
            menu_items: 'Salad bowl',
            caption_angle: '—',
            why: '',
          },
        ],
      },
      LABELS,
    )
    expect(text).toContain('Wednesday · Carousel · 11:30 — Salad bowl\n')
    expect(text).not.toContain('Caption:')
    expect(text).not.toContain('Why:')
  })

  it('omits summary when it duplicates the title', () => {
    const text = formatWeeklyInstagramScheduleShareText(
      {
        title: 'Weekly Instagram Plan',
        summary: 'Weekly Instagram Plan',
        days: [
          {
            day: 'monday',
            time: '8:00 AM',
            format: 'story',
            menu_items: 'Breakfast',
            caption_angle: '—',
            why: '—',
          },
        ],
      },
      LABELS,
    )
    expect(text.startsWith('Weekly Instagram Plan\n\nMonday')).toBe(true)
    expect(text.match(/Weekly Instagram Plan/g)).toHaveLength(1)
  })

  it('omits placeholder summary', () => {
    const text = formatWeeklyInstagramScheduleShareText(
      {
        title: 'Weekly Instagram Plan',
        summary: '—',
        days: [
          {
            day: 'monday',
            time: '8:00 AM',
            format: 'story',
            menu_items: 'Breakfast',
            caption_angle: '—',
            why: '—',
          },
        ],
      },
      LABELS,
    )
    expect(text.startsWith('Weekly Instagram Plan\n\nMonday')).toBe(true)
    expect(text).not.toContain('—\n')
  })
})

describe('shareOrCopyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })

    await expect(shareOrCopyText('Hello colleagues')).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith({ text: 'Hello colleagues' })
  })

  it('copies when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await expect(shareOrCopyText('Hello colleagues')).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith('Hello colleagues')
  })

  it('throws ShareCancelledError when the user aborts share', async () => {
    const abort = Object.assign(new Error('Abort'), { name: 'AbortError' })
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(abort),
      clipboard: { writeText: vi.fn() },
    })

    await expect(shareOrCopyText('x')).rejects.toBeInstanceOf(ShareCancelledError)
  })

  it('falls back to clipboard when share fails non-abort', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      clipboard: { writeText },
    })

    await expect(shareOrCopyText('fallback')).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith('fallback')
  })
})
