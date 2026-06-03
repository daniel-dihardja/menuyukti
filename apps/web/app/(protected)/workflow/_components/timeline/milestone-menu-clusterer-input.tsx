'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Textarea } from '@workspace/ui/components/textarea'

import { MilestoneFieldDescription } from './milestone-field-description'

export type MenuClustererInputDraft = {
  notes: string
}

export type MilestoneMenuClustererInputProps = {
  draft: MenuClustererInputDraft
  onDraftChange: (next: MenuClustererInputDraft) => void
  onNotesBlur: () => void
  onNotesFocus: () => void
  disabled?: boolean
}

export function MilestoneMenuClustererInput({
  draft,
  onDraftChange,
  onNotesBlur,
  onNotesFocus,
  disabled = false,
}: MilestoneMenuClustererInputProps) {
  const t = useTranslations('analytics.workflows.chat.milestonePreset.menu_clusterer')

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel>{t('inputLabel')}</FieldLabel>
        <MilestoneFieldDescription content={t('inputDescription')} />
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
    </FieldGroup>
  )
}
