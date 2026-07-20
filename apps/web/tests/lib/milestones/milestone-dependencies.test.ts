import { describe, expect, it } from 'vitest'

import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import {
  defaultDependencyId,
  dependencyIdsFromValue,
  dependencyOptionLabel,
  listDependencyCandidates,
  resolveDependencyMilestone,
  withPreservedDependencyIds,
} from '@/lib/milestones/milestone-dependencies'

function milestone(
  partial: Pick<TimelineMilestone, 'id' | 'title' | 'presetId'> &
    Partial<Pick<TimelineMilestone, 'milestoneInput' | 'displayCode'>>,
): TimelineMilestone {
  return {
    id: partial.id,
    title: partial.title,
    passCriteria: [],
    presetId: partial.presetId,
    milestoneInput: partial.milestoneInput,
    displayCode: partial.displayCode,
  }
}

describe('milestone-dependencies', () => {
  const milestones = [
    milestone({ id: '1', title: 'Brief A', presetId: 'restaurant_campaign_brief' }),
    milestone({ id: '2', title: 'Brief B', presetId: 'restaurant_campaign_brief' }),
    milestone({ id: '3', title: 'IG Plan', presetId: 'ig_plan' }),
  ]

  it('lists prior candidates of the required preset type', () => {
    expect(
      listDependencyCandidates(milestones, '3', 'restaurant_campaign_brief').map((m) => m.id),
    ).toEqual(['1', '2'])
  })

  it('defaults to the nearest prior candidate', () => {
    expect(defaultDependencyId(milestones, '3', 'restaurant_campaign_brief')).toBe('2')
  })

  it('resolves selected id when valid, else nearest prior', () => {
    expect(resolveDependencyMilestone(milestones, '3', 'restaurant_campaign_brief', '1')?.id).toBe(
      '1',
    )
    expect(
      resolveDependencyMilestone(milestones, '3', 'restaurant_campaign_brief', '999')?.id,
    ).toBe('2')
    expect(
      resolveDependencyMilestone(milestones, '3', 'restaurant_campaign_brief', undefined)?.id,
    ).toBe('2')
  })

  it('preserves dependency ids when merging input values', () => {
    const next = withPreservedDependencyIds(
      { notes: 'hello' },
      { notes: 'old', sourceCampaignBriefMilestoneId: '1' },
    )
    expect(next).toEqual({
      sourceCampaignBriefMilestoneId: '1',
      notes: 'hello',
    })
    expect(dependencyIdsFromValue(next)).toEqual({
      sourceCampaignBriefMilestoneId: '1',
    })
  })

  it('dependencyOptionLabel prefers displayCode over node id', () => {
    expect(
      dependencyOptionLabel(
        milestone({
          id: '99',
          title: 'Brief A',
          presetId: 'restaurant_campaign_brief',
          displayCode: 'M-A3F2',
        }),
      ),
    ).toBe('M-A3F2 · Brief A')
    expect(
      dependencyOptionLabel(
        milestone({ id: '99', title: 'Brief A', presetId: 'restaurant_campaign_brief' }),
      ),
    ).toBe('99 · Brief A')
  })
})
