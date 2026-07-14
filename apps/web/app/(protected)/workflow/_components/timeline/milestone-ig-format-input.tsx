'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Textarea } from '@workspace/ui/components/textarea'

import type { IgPlanEntry } from '@/lib/graphql/node-schemas'
import { resolveIgMenuPickerEntriesForFormat } from '@/lib/milestones/ig-format-input'

import { MilestoneFieldDescription } from './milestone-field-description'
import { useTimelineWorkspaceState } from '../timeline-context'

export type MilestoneIgFormatInputProps = {
  milestoneId: string
  notes: string
  onNotesChange: (next: string) => void
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

export function MilestoneIgFormatInput({
  milestoneId,
  notes,
  onNotesChange,
  onNotesBlur,
  onNotesFocus,
  disabled = false,
}: MilestoneIgFormatInputProps) {
  const t = useTranslations('analytics.workflows.chat')
  const { milestoneState } = useTimelineWorkspaceState()

  const entries = useMemo(
    () => resolveIgMenuPickerEntriesForFormat(milestoneState.milestones, milestoneId),
    [milestoneId, milestoneState.milestones],
  )

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
      {entries.length === 0 ? (
        <Alert>
          <AlertDescription>
            <p className="font-medium">{t('milestoneIgFormatInputNoPriorMenuPickerTitle')}</p>
            <p className="text-muted-foreground">
              {t('milestoneIgFormatInputNoPriorMenuPickerBody')}
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        <FieldSet>
          <FieldLegend>{t('milestoneIgFormatInputEntriesLabel')}</FieldLegend>
          <MilestoneFieldDescription content={t('milestoneIgFormatInputEntriesDescription')} />
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-left">
                  <th className="px-3 py-2 font-medium">{t('milestoneIgPlanPreviewColDay')}</th>
                  <th className="px-3 py-2 font-medium">{t('milestoneIgPlanPreviewColTime')}</th>
                  <th className="px-3 py-2 font-medium">
                    {t('milestoneIgPlanPreviewColObjective')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('milestoneIgPlanPreviewColProductRole')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('milestoneIgMenuPickerPreviewColMenuItems')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => (
                  <tr key={entry.slotKey} className="border-b border-border/50">
                    <td className="px-3 py-2 align-top">{weekdayLabel(entry.day)}</td>
                    <td className="px-3 py-2 align-top tabular-nums">{entry.slot}</td>
                    <td className="px-3 py-2 align-top">{entry.objective}</td>
                    <td className="px-3 py-2 align-top">
                      <Badge variant="secondary" className="text-xs">
                        {productRoleLabel(entry.productRole)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <ul className="space-y-1">
                        {entry.menuItems.map((item, index) => (
                          <li key={`${item.menu}-${index}`} className="font-medium">
                            {item.menu}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FieldSet>
      )}

      <Field>
        <FieldLabel htmlFor={`ig-format-notes-${milestoneId}`}>
          {t('milestoneIgFormatInputNotesLabel')}
        </FieldLabel>
        <MilestoneFieldDescription content={t('milestoneIgFormatInputNotesDescription')} />
        <Textarea
          className="min-h-[120px] resize-y whitespace-pre-wrap"
          disabled={disabled}
          id={`ig-format-notes-${milestoneId}`}
          onBlur={onNotesBlur}
          onFocus={onNotesFocus}
          onChange={(e) => onNotesChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={t('milestoneIgFormatInputNotesPlaceholder')}
          value={notes}
        />
      </Field>
    </FieldGroup>
  )
}
