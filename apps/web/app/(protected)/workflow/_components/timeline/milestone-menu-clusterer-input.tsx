'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'

import {
  MENU_CLUSTERER_DERIVED_MAX_GROUP_COUNT,
  MENU_CLUSTERER_DERIVED_MIN_GROUP_COUNT,
} from '@/lib/graphql/node-schemas/milestone-presets'

import { MilestoneFieldDescription } from './milestone-field-description'

export type MenuClustererInputDraft = {
  notes: string
  targetGroupCount?: number
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
        <FieldLabel>{t('targetGroupCountLabel')}</FieldLabel>
        <MilestoneFieldDescription content={t('targetGroupCountDescription')} />
        <Input
          disabled={disabled}
          inputMode="numeric"
          min={MENU_CLUSTERER_DERIVED_MIN_GROUP_COUNT}
          max={MENU_CLUSTERER_DERIVED_MAX_GROUP_COUNT}
          onChange={(e) => {
            const raw = e.target.value.trim()
            if (!raw) {
              onDraftChange({ ...draft, targetGroupCount: undefined })
              return
            }
            const parsed = Number.parseInt(raw, 10)
            if (Number.isNaN(parsed)) {
              return
            }
            onDraftChange({ ...draft, targetGroupCount: parsed })
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={t('targetGroupCountPlaceholder')}
          type="number"
          value={draft.targetGroupCount ?? ''}
        />
      </Field>
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
