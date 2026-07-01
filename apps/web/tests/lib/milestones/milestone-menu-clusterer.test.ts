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
      'milestonePreset.menu_clusterer.criterionCategoryScope',
      'milestonePreset.menu_clusterer.criterionTopFiveLead',
      'milestonePreset.menu_clusterer.criterionClusterDescription',
    ])
  })

  it('menuClustererInputFromMilestoneInput reads notes and optional targetGroupCount', () => {
    expect(
      menuClustererInputFromMilestoneInput({
        type: 'menu_clusterer',
        value: { notes: 'focus mains' },
      }),
    ).toEqual({ notes: 'focus mains', targetGroupCount: undefined })
    expect(
      menuClustererInputFromMilestoneInput({
        type: 'menu_clusterer',
        value: { notes: 'legacy only', targetGroupCount: 6 },
      }),
    ).toEqual({ notes: 'legacy only', targetGroupCount: 6 })
    expect(normalizeMenuClustererInput({ notes: '  hi ', targetGroupCount: 8 })).toEqual({
      notes: 'hi',
      targetGroupCount: 8,
    })
  })

  it('patchMilestoneSchema accepts menu_clusterer milestoneInput with targetGroupCount', () => {
    const parsed = patchMilestoneSchema.safeParse({
      milestoneInput: {
        type: 'menu_clusterer',
        value: { notes: 'seasonal', targetGroupCount: 8 },
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.milestoneInput).toEqual({
        type: 'menu_clusterer',
        value: { notes: 'seasonal', targetGroupCount: 8 },
      })
    }
  })

  it('parses realistic menu clusterer output with topFiveGroupCount below hook minimum', () => {
    const parsed = menuClustererMilestoneDataSchema.safeParse({
      foodLeads: [],
      groups: [
        {
          id: 'group-top-five-mains',
          leadName: 'Nasi Goreng',
          profileId: 'top_five',
          category: 'MAINS',
          anchor: { dimension: 'reel_moment', value: 'static_hero' },
          items: [
            {
              name: 'Nasi Goreng',
              role: 'star',
              category: 'MAINS',
              position: 1,
              storytellingFit: 'strong',
            },
          ],
          mix: {
            priceLevels: [],
            storytellingStrongCount: 1,
            starCount: 1,
            puzzleCount: 0,
          },
          clusterDescription: 'Top MAINS carousel cluster for signature lunch dishes.'.padEnd(
            40,
            '.',
          ),
        },
        {
          id: 'group-1',
          leadName: 'Nasi Goreng',
          profileId: 'hook_reel',
          categoryScope: 'categorical',
          anchor: { dimension: 'reel_moment', value: 'static_hero' },
          items: [
            {
              name: 'Nasi Goreng',
              role: 'star',
              category: 'MAINS',
              position: 1,
              storytellingFit: 'strong',
            },
          ],
          mix: {
            priceLevels: [],
            storytellingStrongCount: 1,
            starCount: 1,
            puzzleCount: 0,
          },
          clusterDescription: 'Categorical MAINS cluster grouped by savory lunch tags.'.padEnd(
            40,
            '.',
          ),
          strategyFocus: 'weekday_lunch',
          coreMessage: 'Weekday lunch offer',
          creativeRole: 'hero',
          assetHint: 'Hero shot of Nasi Goreng',
        },
      ],
      unassignedItemNames: [],
      topFoodLeadNames: ['Nasi Goreng'],
      targetGroupCount: 4,
      topFiveGroupCount: 2,
    })
    expect(parsed.success).toBe(true)
  })
})
