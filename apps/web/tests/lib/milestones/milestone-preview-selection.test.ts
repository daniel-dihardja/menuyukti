import { describe, expect, it } from 'vitest'

import { syncMilestonePreviewSelectionId } from '@/lib/milestones/milestone-preview-selection'

describe('syncMilestonePreviewSelectionId', () => {
  it('keeps null when nothing is selected', () => {
    expect(syncMilestonePreviewSelectionId(null, ['a', 'b'])).toBe(null)
  })

  it('keeps selection when id is still present', () => {
    expect(syncMilestonePreviewSelectionId('b', ['a', 'b', 'c'])).toBe('b')
  })

  it('clears selection when id is no longer in the list', () => {
    expect(syncMilestonePreviewSelectionId('removed', ['a', 'b'])).toBe(null)
  })

  it('clears selection when the list becomes empty', () => {
    expect(syncMilestonePreviewSelectionId('a', [])).toBe(null)
  })
})
