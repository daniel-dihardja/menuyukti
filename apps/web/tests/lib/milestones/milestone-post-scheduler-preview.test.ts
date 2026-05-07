import { describe, expect, it } from 'vitest'

import { postSchedulerMilestoneDataSchema } from '@/lib/graphql/node-schemas'

describe('post scheduler milestone schema', () => {
  it('accepts the new five-section payload', () => {
    const parsed = postSchedulerMilestoneDataSchema.safeParse({
      monthlyArc: {
        weeks: [
          { week: 1, objective: 'Awareness kickoff', rationale: 'Build reach first.' },
          { week: 2, objective: 'Consideration proof', rationale: 'Drive saves via proof.' },
          { week: 3, objective: 'Conversion push', rationale: 'Strong CTA intent.' },
          { week: 4, objective: 'Community loyalty', rationale: 'Retain and celebrate regulars.' },
        ],
      },
      contentRatio: {
        pillars: [
          { pillar: 'Signature dishes', percent: 40, reason: 'Anchor appetite demand.' },
          { pillar: 'Social proof', percent: 30, reason: 'Increase trust.' },
          { pillar: 'Behind the scenes', percent: 30, reason: 'Build brand intimacy.' },
        ],
      },
      formatMix: {
        formats: [
          { format: 'Reels', count: 8, reason: 'Maximize discovery.' },
          { format: 'Carousels', count: 4, reason: 'Education and proof.' },
          { format: 'Single posts', count: 4, reason: 'Conversion prompts.' },
          { format: 'Stories', count: 30, reason: 'Daily touchpoints.' },
          { format: 'Highlights updates', count: 2, reason: 'Keep profile utility fresh.' },
          { format: 'Lives', count: 1, reason: 'Real-time interaction.' },
          { format: 'Collaborator posts', count: 2, reason: 'Borrowed trust and reach.' },
        ],
      },
      weeklySlotPlan: [
        {
          week: 1,
          day: 'Monday',
          format: 'Reel',
          pillar: 'Signature dishes',
          hook: 'Close-up sizzle in first second.',
          captionStructure: 'Hook -> Context -> Proof -> CTA summary',
          ctaType: 'Reserve',
          funnelStage: 'Awareness',
          visualDirection: 'Natural light kitchen pass shot.',
          notes: 'Use lunch-time posting window.',
        },
      ],
      guardrailCheck:
        'Guardrails satisfied for promotion load, save posts, contextual moments, and CTA variety.',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects legacy payload shape', () => {
    const parsed = postSchedulerMilestoneDataSchema.safeParse({
      dateConcepts: [],
      daySummary: { weekdayCount: 5, weekendCount: 2 },
    })
    expect(parsed.success).toBe(false)
  })

  it('requires native weeklySlotPlan array items', () => {
    const parsed = postSchedulerMilestoneDataSchema.safeParse({
      monthlyArc: { weeks: [] },
      contentRatio: { pillars: [] },
      formatMix: { formats: [] },
      weeklySlotPlan: [
        {
          week: '1',
        },
      ],
      guardrailCheck: '',
    })
    expect(parsed.success).toBe(false)
  })
})
