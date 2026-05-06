'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'

import {
  MILESTONE_PRESET_IDS,
  isMilestonePresetId,
  type MilestonePresetId,
} from '@/lib/milestones/preset-definitions'
import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'

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
  const t = useTranslations('analytics.campaigns.chat')
  const [presetChoice, setPresetChoice] = useState<string>(MILESTONE_PRESET_NONE)

  const handleCreateClick = async () => {
    let ok = false
    if (presetChoice === MILESTONE_PRESET_NONE) {
      ok = await onCreateMilestone()
    } else if (isMilestonePresetId(presetChoice)) {
      ok = await onCreateMilestoneFromPreset(presetChoice)
    }
    if (ok) {
      setPresetChoice(MILESTONE_PRESET_NONE)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Select disabled={disabled} onValueChange={setPresetChoice} value={presetChoice}>
        <SelectTrigger
          aria-label={t('milestonePreset.selectAriaLabel')}
          className="w-[min(100%,11rem)]"
        >
          <SelectValue placeholder={t('milestonePreset.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={MILESTONE_PRESET_NONE}>{t('milestonePreset.noneLabel')}</SelectItem>
          {MILESTONE_PRESET_IDS.map((id) => (
            <SelectItem key={id} value={id}>
              {presetOptionLabel(id, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              aria-busy={creating}
              aria-label={creating ? t('creatingMilestone') : t('createMilestone')}
              disabled={disabled}
              onClick={() => void handleCreateClick()}
              size="icon"
              type="button"
              variant="default"
            >
              {creating ? <Spinner /> : <Plus aria-hidden />}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{creating ? t('creatingMilestone') : t('createMilestone')}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function presetOptionLabel(id: MilestonePresetId, t: (key: string) => string): string {
  switch (id) {
    case 'dates':
      return t('milestonePreset.dates.label')
    case 'restaurant_brand_brief':
      return t('milestonePreset.restaurant_brand_brief.label')
    case 'promotion_candidates':
      return t('milestonePreset.promotion_candidates.label')
    case 'post_scheduler':
      return t('milestonePreset.post_scheduler.label')
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}
