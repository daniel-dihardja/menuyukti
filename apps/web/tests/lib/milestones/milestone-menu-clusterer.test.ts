import { describe, expect, it } from 'vitest'

import { patchMilestoneSchema } from '@/app/api/workflows/[id]/milestones/schema'
import {
  getMilestonePresetCreateFields,
  MILESTONE_PRESET_REGISTRY,
} from '@/lib/milestones/preset-definitions'
import { menuClustererMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import {
  normalizeMenuClustererInput,
  menuClustererInputFromMilestoneInput,
} from '@/lib/milestones/milestone-input-tab'

describe('menu_clusterer preset', () => {
  it('registers preset with empty data schema', () => {
    const parsed = menuClustererMilestoneDataSchema.safeParse(
      MILESTONE_PRESET_REGISTRY.menu_clusterer.emptyData,
    )
    expect(parsed.success).toBe(true)
  })

  it('getMilestonePresetCreateFields seeds menu_clusterer input', () => {
    const fields = getMilestonePresetCreateFields('menu_clusterer', (k) => k)
    expect(fields.presetId).toBe('menu_clusterer')
    expect(fields.milestoneInput).toEqual({
      type: 'menu_clusterer',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toMatchObject({
      foodLeads: [],
    })
    expect(fields.passCriteria?.map((row) => row.requirement)).toEqual([
      'milestonePreset.menu_clusterer.criterionPriorCampaignBrief',
      'milestonePreset.menu_clusterer.criterionPriorMenuTagger',
      'milestonePreset.menu_clusterer.criterionHookGroupCount',
      'milestonePreset.menu_clusterer.criterionTopFiveLead',
      'milestonePreset.menu_clusterer.criterionClusterDescription',
    ])
  })

  it('menuClustererInputFromMilestoneInput reads notes only', () => {
    expect(
      menuClustererInputFromMilestoneInput({
        type: 'menu_clusterer',
        value: { notes: 'focus mains' },
      }),
    ).toEqual({ notes: 'focus mains' })
    expect(
      menuClustererInputFromMilestoneInput({
        type: 'menu_clusterer',
        value: { notes: 'legacy only', targetGroupCount: 6 },
      }),
    ).toEqual({ notes: 'legacy only' })
    expect(normalizeMenuClustererInput({ notes: '  hi ' })).toEqual({
      notes: 'hi',
    })
  })

  it('patchMilestoneSchema accepts menu_clusterer milestoneInput with notes only', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: {
        type: 'menu_clusterer',
        value: { notes: 'seasonal' },
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'menu_clusterer',
        value: { notes: 'seasonal' },
      })
    }
  })

  it('patchMilestoneSchema strips legacy targetGroupCount from menu_clusterer input', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: {
        type: 'menu_clusterer',
        value: { notes: 'seasonal', targetGroupCount: 5 },
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'menu_clusterer',
        value: { notes: 'seasonal' },
      })
    }
  })
})
