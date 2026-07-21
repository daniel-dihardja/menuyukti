import { describe, expect, it } from 'vitest'

import { draftsMilestoneDataSchema, milestonedataValueSchema } from '@/lib/graphql/node-schemas'
import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  draftListTitle,
  normalizeDraftsData,
  normalizeDraftsMilestoneTitle,
} from '@/lib/milestones/drafts'

describe('draftListTitle', () => {
  it('prefers an explicit name', () => {
    expect(
      draftListTitle({ name: 'Monday story', body: '# Ignored heading\nBody' }, 'Untitled'),
    ).toBe('Monday story')
  })

  it('falls back to first markdown line when name is empty', () => {
    expect(draftListTitle({ name: '', body: '' }, 'Untitled draft')).toBe('Untitled draft')
    expect(draftListTitle({ name: '  ', body: '# Morning coffee\n\nBody' }, 'Untitled')).toBe(
      'Morning coffee',
    )
  })

  it('truncates long titles', () => {
    const long = 'A'.repeat(100)
    const title = draftListTitle({ name: long, body: '' }, 'Untitled')
    expect(title.endsWith('…')).toBe(true)
    expect(title.length).toBeLessThanOrEqual(72)
  })
})

describe('normalizeDraftsData', () => {
  it('returns drafts payload when valid and defaults missing name', () => {
    const parsed = normalizeDraftsData({ drafts: [{ id: '1', body: 'hi' }] })
    expect(parsed).toEqual({ drafts: [{ id: '1', name: '', body: 'hi' }] })
  })

  it('recovers from legacy stories key', () => {
    expect(
      normalizeDraftsData({
        stories: [{ id: 'legacy', body: 'from stories' }],
      }),
    ).toEqual({ drafts: [{ id: 'legacy', name: '', body: 'from stories' }] })
  })

  it('recovers empty board from corrupted all-default IG payloads', () => {
    expect(
      normalizeDraftsData({
        scheduleExplanation: '',
        entries: [],
        sourceAnalyticsRunId: '',
        reportingPeriod: '',
      }),
    ).toEqual({ drafts: [] })
  })
})

describe('normalizeDraftsMilestoneTitle', () => {
  it('maps the legacy default card title to Drafts', () => {
    expect(normalizeDraftsMilestoneTitle('IG Story drafts')).toBe('Drafts')
    expect(normalizeDraftsMilestoneTitle('My notes')).toBe('My notes')
  })
})

describe('drafts milestoneData union', () => {
  const payload = {
    drafts: [
      { id: 'draft-1', name: 'Morning special', body: '# Morning special\n\nCome by for coffee.' },
    ],
  }

  it('preserves drafts when parsing milestonedataValueSchema', () => {
    const parsed = milestonedataValueSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data).toEqual(payload)
  })

  it('preserves drafts when parsing patchMilestoneSchema', () => {
    const parsed = patchMilestoneSchema.safeParse({ milestoneData: payload })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.milestoneData).toEqual(payload)
  })

  it('does not treat empty objects as drafts', () => {
    expect(draftsMilestoneDataSchema.safeParse({}).success).toBe(false)
  })
})
