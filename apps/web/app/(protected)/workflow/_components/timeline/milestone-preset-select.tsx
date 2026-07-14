'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  MILESTONE_PRESET_IDS,
  isMilestonePresetId,
  milestonePresetIconFor,
  type MilestonePresetId,
} from '@/lib/milestones/preset-definitions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'

const MILESTONE_PRESET_NONE = '__none__' as const

export type MilestoneCreateControlsProps = {
  disabled: boolean
  creating: boolean
  onCreateMilestone: () => boolean | Promise<boolean>
  onCreateMilestoneFromPreset: (presetId: MilestonePresetId) => boolean | Promise<boolean>
}

export function MilestoneCreateControls({
  disabled,
  creating,
  onCreateMilestone,
  onCreateMilestoneFromPreset,
}: MilestoneCreateControlsProps) {
  const t = useTranslations('analytics.workflows.chat')
  const [presetChoice, setPresetChoice] = useState<string | undefined>(undefined)

  const handleValueChange = async (value: string) => {
    if (value === MILESTONE_PRESET_NONE) {
      await onCreateMilestone()
    } else if (isMilestonePresetId(value)) {
      await onCreateMilestoneFromPreset(value)
    }
    setPresetChoice(undefined)
  }

  return (
    <div className="flex shrink-0 items-center">
      <Select
        disabled={disabled || creating}
        onValueChange={(v) => void handleValueChange(v)}
        value={presetChoice}
      >
        <SelectTrigger
          aria-busy={creating}
          aria-label={creating ? t('creatingMilestone') : t('milestonePreset.selectAriaLabel')}
          className="w-44"
        >
          {creating ? <Spinner className="shrink-0" /> : null}
          <SelectValue placeholder={t('milestonePreset.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={MILESTONE_PRESET_NONE}>{t('milestonePreset.noneLabel')}</SelectItem>
          {MILESTONE_PRESET_IDS.map((id) => (
            <SelectItem key={id} value={id}>
              {presetOptionContent(id, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function presetOptionLabel(id: MilestonePresetId, t: (key: string) => string): string {
  switch (id) {
    case 'dates':
      return t('milestonePreset.dates.label')
    case 'restaurant_campaign_brief':
      return t('milestonePreset.restaurant_campaign_brief.label')
    case 'promotion_candidates':
      return t('milestonePreset.promotion_candidates.label')
    case 'menu_tagger':
      return t('milestonePreset.menu_tagger.label')
    case 'menu_clusterer':
      return t('milestonePreset.menu_clusterer.label')
    case 'culture_hooks':
      return t('milestonePreset.culture_hooks.label')
    case 'ig_profile':
      return t('milestonePreset.ig_profile.label')
    case 'ig_plan':
      return t('milestonePreset.ig_plan.label')
    case 'ig_menu_picker':
      return t('milestonePreset.ig_menu_picker.label')
    case 'ig_format':
      return t('milestonePreset.ig_format.label')
    case 'ig_text':
      return t('milestonePreset.ig_text.label')
    case 'scheduler':
      return t('milestonePreset.scheduler.label')
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

function presetOptionContent(id: MilestonePresetId, t: (key: string) => string) {
  const Icon = milestonePresetIconFor(id)

  return (
    <span className="inline-flex items-center gap-2">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span>{presetOptionLabel(id, t)}</span>
    </span>
  )
}
