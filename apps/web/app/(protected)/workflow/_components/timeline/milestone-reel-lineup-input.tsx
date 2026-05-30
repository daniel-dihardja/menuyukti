'use client'

import { useTranslations } from 'next-intl'

import { Field, FieldDescription, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Textarea } from '@workspace/ui/components/textarea'

import type { ReelLineupTargetGroupCount } from '@/lib/graphql/node-schemas'

export type ReelLineupInputDraft = {
  notes: string
  targetGroupCount: ReelLineupTargetGroupCount
}

const TARGET_GROUP_COUNT_OPTIONS: ReelLineupTargetGroupCount[] = [4, 5, 6, 7, 8]

export type MilestoneReelLineupInputProps = {
  draft: ReelLineupInputDraft
  onDraftChange: (next: ReelLineupInputDraft) => void
  onNotesBlur: () => void
  onNotesFocus: () => void
  disabled?: boolean
}

export function MilestoneReelLineupInput({
  draft,
  onDraftChange,
  onNotesBlur,
  onNotesFocus,
  disabled = false,
}: MilestoneReelLineupInputProps) {
  const t = useTranslations('analytics.workflows.chat.milestonePreset.reel_lineup')

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel>{t('targetGroupCountLabel')}</FieldLabel>
        <FieldDescription>{t('targetGroupCountDescription')}</FieldDescription>
        <Select
          disabled={disabled}
          onValueChange={(value) => {
            const parsed = Number.parseInt(value, 10)
            if (parsed >= 4 && parsed <= 8) {
              onDraftChange({
                ...draft,
                targetGroupCount: parsed as ReelLineupTargetGroupCount,
              })
            }
          }}
          value={String(draft.targetGroupCount)}
        >
          <SelectTrigger aria-label={t('targetGroupCountAria')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGET_GROUP_COUNT_OPTIONS.map((count) => (
              <SelectItem key={count} value={String(count)}>
                {t('targetGroupCountOption', { count })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
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
    </FieldGroup>
  )
}
