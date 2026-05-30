'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'

import type { CampaignBriefInputDraft } from '@/lib/milestones/campaign-brief-input'

export type MilestoneCampaignBriefInputProps = {
  draft: CampaignBriefInputDraft
  onDraftChange: (next: CampaignBriefInputDraft) => void
  onNotesBlur: () => void
  onNotesFocus: () => void
  disabled?: boolean
}

export function MilestoneCampaignBriefInput({
  draft,
  onDraftChange,
  onNotesBlur,
  onNotesFocus,
  disabled = false,
}: MilestoneCampaignBriefInputProps) {
  const t = useTranslations('analytics.workflows.chat.milestonePreset.restaurant_campaign_brief')

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel>{t('inputLabel')}</FieldLabel>
        <FieldDescription>{t('inputDescription')}</FieldDescription>
        <Textarea
          className="min-h-[120px] resize-y whitespace-pre-wrap"
          disabled={disabled}
          onBlur={onNotesBlur}
          onFocus={onNotesFocus}
          onChange={(e) => onDraftChange({ ...draft, notes: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={t('inputPlaceholder')}
          value={draft.notes}
        />
      </Field>
      <Field orientation="horizontal">
        <div className="flex flex-1 flex-col gap-1">
          <FieldLabel htmlFor="campaign-brief-reflection">{t('reflectionLabel')}</FieldLabel>
          <FieldDescription>{t('reflectionDescription')}</FieldDescription>
        </div>
        <Switch
          checked={draft.reflection.enabled}
          disabled={disabled}
          id="campaign-brief-reflection"
          onCheckedChange={(enabled) =>
            onDraftChange({
              ...draft,
              reflection: { ...draft.reflection, enabled },
            })
          }
        />
      </Field>
    </FieldGroup>
  )
}
