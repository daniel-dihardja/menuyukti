import { describe, expect, it } from 'vitest'

import {
  parseReflectionCritiqueSummaryPayload,
  reflectionRoundSummary,
  upsertReflectionRound,
} from '@/lib/milestones/campaign-brief-reflection-run'

describe('campaign-brief-reflection-run', () => {
  it('parses critique summary payload', () => {
    const round = parseReflectionCritiqueSummaryPayload({
      step: 'reflect_critique_summary',
      iteration: 1,
      critiques: [
        { id: 'c1', quality_pass: true, feedback: 'Looks good' },
        { id: 'c2', quality_pass: false, feedback: 'Too generic' },
      ],
    })
    expect(round).toEqual({
      iteration: 1,
      critiques: [
        { criterionId: 'c1', qualityPass: true, feedback: 'Looks good' },
        { criterionId: 'c2', qualityPass: false, feedback: 'Too generic' },
      ],
    })
  })

  it('upserts rounds by iteration', () => {
    const first = {
      iteration: 1,
      critiques: [{ criterionId: 'c1', qualityPass: false, feedback: 'Weak' }],
    }
    const second = {
      iteration: 2,
      critiques: [{ criterionId: 'c1', qualityPass: true, feedback: 'Better' }],
    }
    expect(upsertReflectionRound([first], second)).toEqual([first, second])
    expect(upsertReflectionRound([first], { iteration: 1, critiques: second.critiques })).toEqual([
      { iteration: 1, critiques: second.critiques },
    ])
  })

  it('summarizes pass and fail counts', () => {
    expect(
      reflectionRoundSummary({
        iteration: 1,
        critiques: [
          { criterionId: 'a', qualityPass: true, feedback: '' },
          { criterionId: 'b', qualityPass: false, feedback: 'Fix' },
        ],
      }),
    ).toEqual({ passCount: 1, failCount: 1, total: 2 })
  })
})
