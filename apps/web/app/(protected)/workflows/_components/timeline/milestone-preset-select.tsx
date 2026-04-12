'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  MILESTONE_PRESET_IDS,
  isMilestonePresetId,
  type MilestonePresetId,
} from '@/lib/milestones/preset-definitions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

export type MilestonePresetSelectProps = {
  disabled: boolean
  onCreateFromPreset: (presetId: MilestonePresetId) => void | Promise<void>
}

export function MilestonePresetSelect({
  disabled,
  onCreateFromPreset,
}: MilestonePresetSelectProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const [instanceKey, setInstanceKey] = useState(0)

  return (
    <Select
      key={instanceKey}
      disabled={disabled}
      onValueChange={(value) => {
        if (!isMilestonePresetId(value)) {
          return
        }
        void (async () => {
          await onCreateFromPreset(value)
          setInstanceKey((k) => k + 1)
        })()
      }}
    >
      <SelectTrigger
        aria-label={t('milestonePreset.selectAriaLabel')}
        className="w-[min(100%,11rem)]"
      >
        <SelectValue placeholder={t('milestonePreset.selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent position="popper">
        {MILESTONE_PRESET_IDS.map((id) => (
          <SelectItem key={id} value={id}>
            {presetOptionLabel(id, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function presetOptionLabel(id: MilestonePresetId, t: (key: string) => string): string {
  switch (id) {
    case 'dates':
      return t('milestonePreset.dates.label')
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}
