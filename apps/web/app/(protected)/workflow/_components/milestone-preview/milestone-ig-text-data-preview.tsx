'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

import type { IgFormatType, IgTextMilestoneData } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneIgTextDataPreviewProps = {
  data: IgTextMilestoneData
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

function groupTexts(texts: IgTextMilestoneData['entries'][number]['texts']) {
  const slides = new Map<number, Array<{ field: string; value: string }>>()
  const general: Array<{ field: string; value: string }> = []

  for (const row of texts ?? []) {
    const field = row.field.trim()
    const value = row.value.trim()
    if (!field || !value) continue
    const slideMatch = /^slide_(\d+)_(.+)$/.exec(field)
    if (slideMatch) {
      const slideIndex = Number(slideMatch[1])
      const list = slides.get(slideIndex) ?? []
      list.push({ field: slideMatch[2] ?? field, value })
      slides.set(slideIndex, list)
      continue
    }
    general.push({ field, value })
  }

  return { slides, general }
}

export function MilestoneIgTextDataPreview({ data }: MilestoneIgTextDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const scheduleExplanation = data.scheduleExplanation.trim()
  const reportingPeriod = data.reportingPeriod.trim()
  const sourceIgFormatTitle = data.sourceIgFormatTitle?.trim() ?? ''
  const sourceCampaignBriefTitle = data.sourceCampaignBriefTitle?.trim() ?? ''
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
        <p className={mp.body}>{t('milestoneIgTextPreviewEmpty')}</p>
      </div>
    )
  }

  return (
    <div className={mp.root}>
      {sourceIgFormatTitle ? (
        <div className="space-y-1">
          <p className={mp.fieldLabel}>{t('milestoneIgTextPreviewSourceIgFormat')}</p>
          <p className={mp.bodyStrong}>{sourceIgFormatTitle}</p>
        </div>
      ) : null}

      {sourceCampaignBriefTitle ? (
        <div className="space-y-1">
          <p className={mp.fieldLabel}>{t('milestoneIgTextPreviewSourceCampaignBrief')}</p>
          <p className={mp.bodyStrong}>{sourceCampaignBriefTitle}</p>
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

      <div className="space-y-3">
        <p className={mp.sectionTitle}>{t('milestoneIgTextPreviewEntries')}</p>
        {entries.length === 0 ? (
          <p className={mp.body}>{t('milestoneIgTextPreviewEmptyEntries')}</p>
        ) : (
          entries.map((entry, index) => {
            const { slides, general } = groupTexts(entry.texts)
            return (
              <div
                key={`${entry.slotKey}-${entry.slot}-${index}`}
                className="space-y-2 rounded-lg border border-border/80 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={mp.bodyStrong}>
                    {weekdayLabel(entry.day)} · {entry.slot}
                  </span>
                  <Badge variant="secondary">{formatTypeLabel(entry.type)}</Badge>
                </div>
                {general.length > 0 ? (
                  <dl className="space-y-1.5">
                    {general.map((row) => (
                      <div key={row.field}>
                        <dt className={cn(mp.fieldLabel, 'inline')}>{row.field}: </dt>
                        <dd className={cn(mp.body, 'inline')}>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {slides.size > 0 ? (
                  <div className="space-y-2">
                    {[...slides.entries()]
                      .sort(([a], [b]) => a - b)
                      .map(([slideIndex, rows]) => (
                        <div key={slideIndex} className="rounded-md bg-muted/30 p-2">
                          <p className={mp.fieldLabel}>
                            {t('milestoneIgTextPreviewSlide', { index: slideIndex })}
                          </p>
                          <dl className="mt-1 space-y-1">
                            {rows.map((row) => (
                              <div key={`${slideIndex}-${row.field}`}>
                                <dt className={cn(mp.fieldLabel, 'inline')}>{row.field}: </dt>
                                <dd className={cn(mp.body, 'inline')}>{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
