'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

import type { IgFormatMilestoneData, IgFormatType } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneIgFormatDataPreviewProps = {
  data: IgFormatMilestoneData
}

function weekdayLabel(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

function formatTypeLabel(type: IgFormatType): string {
  switch (type) {
    case 'post-carousel':
      return 'Carousel'
    case 'post':
      return 'Post'
    case 'reel':
      return 'Reel'
    case 'story':
      return 'Story'
  }
}

export function MilestoneIgFormatDataPreview({ data }: MilestoneIgFormatDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const scheduleExplanation = data.scheduleExplanation.trim()
  const reportingPeriod = data.reportingPeriod.trim()
  const sourceIgMenuPickerTitle = data.sourceIgMenuPickerTitle?.trim() ?? ''
  const weekdayOrder = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const
  const entries = [...(data.entries ?? [])].sort((a, b) => {
    const dayDelta = weekdayOrder.indexOf(a.day) - weekdayOrder.indexOf(b.day)
    if (dayDelta !== 0) return dayDelta
    return a.slot.localeCompare(b.slot)
  })

  if (entries.length === 0 && !scheduleExplanation) {
    return (
      <div className={mp.root}>
        <p className={mp.body}>{t('milestoneIgFormatPreviewEmptyPlan')}</p>
      </div>
    )
  }

  return (
    <div className={mp.root}>
      {sourceIgMenuPickerTitle ? (
        <div className="space-y-1">
          <p className={mp.fieldLabel}>{t('milestoneIgFormatPreviewSourceIgMenuPicker')}</p>
          <p className={mp.bodyStrong}>{sourceIgMenuPickerTitle}</p>
        </div>
      ) : null}

      {reportingPeriod ? (
        <div className="space-y-1">
          <p className={mp.fieldLabel}>{t('milestoneIgFormatPreviewReportingPeriod')}</p>
          <p className={mp.bodyStrong}>{reportingPeriod}</p>
        </div>
      ) : null}

      {scheduleExplanation ? (
        <div className="space-y-1">
          <p className={mp.fieldLabel}>{t('milestoneIgFormatPreviewScheduleExplanation')}</p>
          <p className={mp.body}>{scheduleExplanation}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className={mp.sectionTitle}>{t('milestoneIgFormatPreviewEntries')}</p>
        {entries.length === 0 ? (
          <p className={mp.body}>{t('milestoneIgFormatPreviewEmptyEntries')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 text-left">
                  <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>
                    {t('milestoneIgPlanPreviewColDay')}
                  </th>
                  <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>
                    {t('milestoneIgPlanPreviewColTime')}
                  </th>
                  <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>
                    {t('milestoneIgPlanPreviewColObjective')}
                  </th>
                  <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>
                    {t('milestoneIgFormatPreviewColFormat')}
                  </th>
                  <th className={cn(mp.fieldLabel, 'py-2')}>
                    {t('milestoneIgMenuPickerPreviewColMenuItems')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr
                    key={`${entry.slotKey}-${entry.slot}-${index}`}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 pr-3 align-top">{weekdayLabel(entry.day)}</td>
                    <td className="py-2 pr-3 align-top tabular-nums">{entry.slot}</td>
                    <td className="py-2 pr-3 align-top">{entry.objective}</td>
                    <td className="py-2 pr-3 align-top">
                      <div className="space-y-1">
                        <Badge variant="secondary">{formatTypeLabel(entry.type)}</Badge>
                        {entry.formatRationale?.trim() ? (
                          <p className="text-xs text-muted-foreground">{entry.formatRationale}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 align-top">
                      <ul className="space-y-2">
                        {(entry.menuItems ?? []).map((item, itemIndex) => (
                          <li key={`${item.menu}-${itemIndex}`}>
                            <div className="font-medium text-foreground">{item.menu}</div>
                            {item.rationale?.trim() ? (
                              <p className="text-xs text-muted-foreground">{item.rationale}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
