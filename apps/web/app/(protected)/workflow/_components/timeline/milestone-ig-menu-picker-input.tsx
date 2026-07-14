'use client'

import { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Textarea } from '@workspace/ui/components/textarea'

import type { IgPlanEntry } from '@/lib/graphql/node-schemas'
import {
  findPriorIgPlanMilestone,
  isIgMenuPickerSlotSelected,
  IG_MENU_PICKER_NONE_SELECTED_SENTINEL,
  resolveIgPlanEntriesForMenuPicker,
  toggleIgMenuPickerSlotKey,
} from '@/lib/milestones/ig-menu-picker-input'

import { MilestoneFieldDescription } from './milestone-field-description'
import { useTimelineWorkspaceState } from '../timeline-context'

export type IgMenuPickerInputDraft = {
  notes: string
  selectedSlotKeys: string[]
}

export type MilestoneIgMenuPickerInputProps = {
  milestoneId: string
  draft: IgMenuPickerInputDraft
  onDraftChange: (next: IgMenuPickerInputDraft) => void
  onNotesBlur: () => void
  onNotesFocus: () => void
  disabled?: boolean
}

function weekdayLabel(day: IgPlanEntry['day']): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

function productRoleLabel(role: IgPlanEntry['productRole']): string {
  return role === 'plow_horse' ? 'Plow horse' : role.charAt(0).toUpperCase() + role.slice(1)
}

export function MilestoneIgMenuPickerInput({
  milestoneId,
  draft,
  onDraftChange,
  onNotesBlur,
  onNotesFocus,
  disabled = false,
}: MilestoneIgMenuPickerInputProps) {
  const t = useTranslations('analytics.workflows.chat')
  const { milestoneState } = useTimelineWorkspaceState()

  const priorIgPlan = useMemo(
    () => findPriorIgPlanMilestone(milestoneState.milestones, milestoneId),
    [milestoneId, milestoneState.milestones],
  )

  const entries = useMemo(
    () => resolveIgPlanEntriesForMenuPicker(milestoneState.milestones, milestoneId),
    [milestoneId, milestoneState.milestones],
  )

  const allSlotKeys = useMemo(() => entries.map((entry) => entry.slotKey), [entries])

  const isEntrySelected = useCallback(
    (slotKey: string) => isIgMenuPickerSlotSelected(slotKey, draft.selectedSlotKeys),
    [draft.selectedSlotKeys],
  )

  const toggleSlotKey = useCallback(
    (slotKey: string, checked: boolean) => {
      onDraftChange({
        ...draft,
        selectedSlotKeys: toggleIgMenuPickerSlotKey(
          draft.selectedSlotKeys,
          allSlotKeys,
          slotKey,
          checked,
        ),
      })
    },
    [allSlotKeys, draft, onDraftChange],
  )

  const selectAll = useCallback(() => {
    onDraftChange({ ...draft, selectedSlotKeys: [] })
  }, [draft, onDraftChange])

  const clearAll = useCallback(() => {
    onDraftChange({ ...draft, selectedSlotKeys: [IG_MENU_PICKER_NONE_SELECTED_SENTINEL] })
  }, [draft, onDraftChange])

  if (!priorIgPlan) {
    return (
      <Alert>
        <AlertDescription>
          <p className="font-medium">{t('milestoneIgMenuPickerInputNoPriorIgPlanTitle')}</p>
          <p className="text-muted-foreground">
            {t('milestoneIgMenuPickerInputNoPriorIgPlanBody')}
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  if (entries.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          <p className="font-medium">{t('milestoneIgMenuPickerInputNoEntriesTitle')}</p>
          <p className="text-muted-foreground">{t('milestoneIgMenuPickerInputNoEntriesBody')}</p>
        </AlertDescription>
      </Alert>
    )
  }

  const weekdayOrder = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const
  const sortedEntries = [...entries].sort((a, b) => {
    const dayDelta = weekdayOrder.indexOf(a.day) - weekdayOrder.indexOf(b.day)
    if (dayDelta !== 0) return dayDelta
    return a.slot.localeCompare(b.slot)
  })

  return (
    <FieldGroup className="gap-4">
      <FieldSet>
        <FieldLegend>{t('milestoneIgMenuPickerInputEntriesLabel')}</FieldLegend>
        <MilestoneFieldDescription content={t('milestoneIgMenuPickerInputEntriesDescription')} />
        <div className="flex flex-wrap gap-2">
          <Button disabled={disabled} onClick={selectAll} size="sm" type="button" variant="outline">
            {t('milestoneIgMenuPickerInputSelectAll')}
          </Button>
          <Button disabled={disabled} onClick={clearAll} size="sm" type="button" variant="outline">
            {t('milestoneIgMenuPickerInputClearAll')}
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border border-border/80">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/30 text-left">
                <th className="w-10 px-3 py-2" />
                <th className="px-3 py-2 font-medium">{t('milestoneIgPlanPreviewColDay')}</th>
                <th className="px-3 py-2 font-medium">{t('milestoneIgPlanPreviewColTime')}</th>
                <th className="px-3 py-2 font-medium">{t('milestoneIgPlanPreviewColObjective')}</th>
                <th className="px-3 py-2 font-medium">
                  {t('milestoneIgPlanPreviewColProductRole')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => {
                const checked = isEntrySelected(entry.slotKey)
                const checkboxId = `ig-menu-picker-${milestoneId}-${entry.slotKey}`
                return (
                  <tr key={entry.slotKey} className="border-b border-border/50">
                    <td className="px-3 py-2 align-top">
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        id={checkboxId}
                        onCheckedChange={(value) => toggleSlotKey(entry.slotKey, value === true)}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">{weekdayLabel(entry.day)}</td>
                    <td className="px-3 py-2 align-top tabular-nums">{entry.slot}</td>
                    <td className="px-3 py-2 align-top">{entry.objective}</td>
                    <td className="px-3 py-2 align-top">
                      <Badge variant="secondary" className="text-xs">
                        {productRoleLabel(entry.productRole)}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </FieldSet>

      <Field>
        <FieldLabel htmlFor={`ig-menu-picker-notes-${milestoneId}`}>
          {t('milestoneIgMenuPickerInputNotesLabel')}
        </FieldLabel>
        <MilestoneFieldDescription content={t('milestoneIgMenuPickerInputNotesDescription')} />
        <Textarea
          className="min-h-[120px] resize-y whitespace-pre-wrap"
          disabled={disabled}
          id={`ig-menu-picker-notes-${milestoneId}`}
          onBlur={onNotesBlur}
          onFocus={onNotesFocus}
          onChange={(e) => onDraftChange({ ...draft, notes: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={t('milestoneIgMenuPickerInputNotesPlaceholder')}
          value={draft.notes}
        />
      </Field>
    </FieldGroup>
  )
}
