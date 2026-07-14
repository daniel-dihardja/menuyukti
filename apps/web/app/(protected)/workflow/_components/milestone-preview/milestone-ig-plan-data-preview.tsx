'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

import type { IgPlanEntry, IgPlanMilestoneData } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneIgPlanDataPreviewProps = {
  data: IgPlanMilestoneData
}

function weekdayLabel(day: IgPlanEntry['day']): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

function productRoleLabel(role: IgPlanEntry['productRole']): string {
  return role === 'plow_horse' ? 'Plow horse' : role.charAt(0).toUpperCase() + role.slice(1)
}

function slotStrategyLabel(strategy: IgPlanEntry['slotStrategy']): string {
  switch (strategy) {
    case 'aggressively_grow':
      return 'Aggressively grow'
    default:
      return strategy.charAt(0).toUpperCase() + strategy.slice(1)
  }
}

function pillarLabel(pillar: IgPlanEntry['pillar']): string {
  return pillar
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function MilestoneIgPlanDataPreview({ data }: MilestoneIgPlanDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const scheduleExplanation = data.scheduleExplanation.trim()
  const reportingPeriod = data.reportingPeriod.trim()
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
        <p className={mp.body}>{t('milestoneIgPlanPreviewEmptyPlan')}</p>
      </div>
    )
  }

  return (
    <div className={mp.root}>
      {reportingPeriod ? (
        <div className="space-y-1">
          <p className={mp.fieldLabel}>{t('milestoneIgPlanPreviewReportingPeriod')}</p>
          <p className={mp.bodyStrong}>{reportingPeriod}</p>
        </div>
      ) : null}

      {scheduleExplanation ? (
        <div className="space-y-1">
          <p className={mp.fieldLabel}>{t('milestoneIgPlanPreviewScheduleExplanation')}</p>
          <p className={mp.body}>{scheduleExplanation}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className={mp.sectionTitle}>{t('milestoneIgPlanPreviewEntries')}</p>
        {entries.length === 0 ? (
          <p className={mp.body}>{t('milestoneIgPlanPreviewEmptyEntries')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
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
                    {t('milestoneIgPlanPreviewColPillar')}
                  </th>
                  <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>
                    {t('milestoneIgPlanPreviewColMealPeriod')}
                  </th>
                  <th className={cn(mp.fieldLabel, 'py-2 pr-3')}>
                    {t('milestoneIgPlanPreviewColSlotStrategy')}
                  </th>
                  <th className={cn(mp.fieldLabel, 'py-2')}>
                    {t('milestoneIgPlanPreviewColProductRole')}
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
                      <Badge variant="outline" className="text-xs">
                        {pillarLabel(entry.pillar)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 align-top capitalize">{entry.mealPeriod}</td>
                    <td className="py-2 pr-3 align-top">
                      <Badge variant="outline" className="text-xs">
                        {slotStrategyLabel(entry.slotStrategy)}
                      </Badge>
                    </td>
                    <td className="py-2 align-top">
                      <Badge variant="secondary" className="text-xs">
                        {productRoleLabel(entry.productRole)}
                      </Badge>
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
