import { describe, expect, it } from 'vitest'

import {
  buildCampaignBriefPipelineStages,
  campaignBriefRunStepLabel,
  isCampaignBriefGenerationStep,
} from '@/lib/milestones/campaign-brief-run-progress'

const labels = {
  prepare: 'Loading signals',
  generate: 'Generating brief',
  review: (pass: number, max: number) => `Reviewing brief (${pass}/${max})`,
  revise: (pass: number, max: number) => `Revising brief (${pass}/${max})`,
  save: 'Saving brief',
  starting: 'Starting…',
}

describe('campaign-brief-run-progress', () => {
  it('detects generation steps', () => {
    expect(isCampaignBriefGenerationStep('generate_draft')).toBe(true)
    expect(isCampaignBriefGenerationStep('reflect_critique')).toBe(true)
    expect(isCampaignBriefGenerationStep('fetch_context')).toBe(false)
  })

  it('labels critique and revise passes with iteration', () => {
    expect(campaignBriefRunStepLabel('reflect_critique', 1, 2, labels)).toBe(
      'Reviewing brief (1/2)',
    )
    expect(campaignBriefRunStepLabel('reflect_revise', 2, 2, labels)).toBe('Revising brief (2/2)')
  })

  it('shows only create while generating', () => {
    expect(buildCampaignBriefPipelineStages('generate_draft', null, true, [])).toEqual([
      { id: 'create', kind: 'create', status: 'active' },
    ])
  })

  it('adds review only after reflection starts', () => {
    expect(buildCampaignBriefPipelineStages('reflect_critique', 1, true, [])).toEqual([
      { id: 'create', kind: 'create', status: 'done' },
      { id: 'review-1', kind: 'review', pass: 1, status: 'active' },
    ])
  })

  it('adds edit only after failed review completes', () => {
    const rounds = [
      {
        iteration: 1,
        critiques: [{ qualityPass: false }, { qualityPass: true }],
      },
    ]
    expect(buildCampaignBriefPipelineStages('reflect_revise', 1, true, rounds)).toEqual([
      { id: 'create', kind: 'create', status: 'done' },
      { id: 'review-1', kind: 'review', pass: 1, status: 'done' },
      { id: 'edit-1', kind: 'edit', pass: 1, status: 'active' },
    ])
  })

  it('skips edit when review pass is fully clean', () => {
    const rounds = [
      {
        iteration: 1,
        critiques: [{ qualityPass: true }],
      },
    ]
    expect(buildCampaignBriefPipelineStages('store_brief', null, true, rounds)).toEqual([
      { id: 'create', kind: 'create', status: 'done' },
      { id: 'review-1', kind: 'review', pass: 1, status: 'done' },
      { id: 'save', kind: 'save', status: 'active' },
    ])
  })
})
