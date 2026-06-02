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
      value: { notes: '', targetGroupCount: 4 },
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

  it('menuClustererInputFromMilestoneInput reads notes and targetGroupCount', () => {
    expect(
      menuClustererInputFromMilestoneInput({
        type: 'menu_clusterer',
        value: { notes: 'focus mains', targetGroupCount: 6 },
      }),
    ).toEqual({ notes: 'focus mains', targetGroupCount: 6 })
    expect(
      menuClustererInputFromMilestoneInput({
        type: 'menu_clusterer',
        value: { notes: 'legacy only' },
      }),
    ).toEqual({ notes: 'legacy only', targetGroupCount: 4 })
    expect(normalizeMenuClustererInput({ notes: '  hi ', targetGroupCount: 8 })).toEqual({
      notes: 'hi',
      targetGroupCount: 8,
    })
  })

  it('patchMilestoneSchema accepts menu_clusterer milestoneInput with targetGroupCount', () => {
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
        value: { notes: 'seasonal', targetGroupCount: 5 },
      })
    }
  })
})
