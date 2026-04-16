'use client'

import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { useMemo } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { datesMilestoneDataSchema } from '@/lib/graphql/node-schemas'

import { useTimelineWorkspaceState } from './timeline-context'

const PREVIEW_TITLE_ID = 'campaign-preview-panel-title'

export function CampaignPreviewPanelBody() {
  const t = useTranslations('analytics.campaigns.chat')
  const tWorkspace = useTranslations('analytics.campaigns.workspace')
  const {
    milestoneState: { milestones },
  } = useTimelineWorkspaceState()
  const [selectedId] = useQueryState('milestone', parseAsString)

  const selectedMilestone =
    selectedId !== null ? milestones.find((m) => m.id === selectedId) : undefined
  const showMilestonePreview = selectedMilestone !== undefined
  const datesData = useMemo(() => {
    if (!selectedMilestone || selectedMilestone.presetId !== 'dates') {
      return null
    }
    const parsed = datesMilestoneDataSchema.safeParse(selectedMilestone.data)
    if (!parsed.success) {
      return null
    }
    return parsed.data
  }, [selectedMilestone])

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-dashed">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base" id={PREVIEW_TITLE_ID}>
          {tWorkspace('previewTitle')}
        </CardTitle>
        <CardDescription className="text-pretty">
          {tWorkspace('previewDescription')}
        </CardDescription>
        {showMilestonePreview ? (
          <p className="truncate font-medium text-foreground text-sm">{selectedMilestone.title}</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-0">
        {showMilestonePreview ? (
          datesData ? (
            <div className="min-h-0 overflow-auto rounded-md border p-4">
              <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                <dt className="font-medium text-foreground">
                  {t('milestoneDatesPreviewStartDate')}
                </dt>
                <dd className="text-muted-foreground">
                  {datesData.startDate || t('milestoneDatesPreviewValueEmpty')}
                </dd>
                <dt className="font-medium text-foreground">{t('milestoneDatesPreviewEndDate')}</dt>
                <dd className="text-muted-foreground">
                  {datesData.endDate || t('milestoneDatesPreviewValueEmpty')}
                </dd>
                <dt className="font-medium text-foreground">
                  {t('milestoneDatesPreviewPublicHolidays')}
                </dt>
                <dd className="text-muted-foreground">
                  {datesData.publicHolidays.length === 0
                    ? t('milestoneDatesPreviewNoHolidays')
                    : datesData.publicHolidays
                        .map((holiday) =>
                          [holiday.name, holiday.date, holiday.description]
                            .filter((part) => part.trim().length > 0)
                            .join(' - '),
                        )
                        .join(', ')}
                </dd>
              </dl>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('milestonePreviewUnsupported')}</p>
          )
        ) : (
          <p className="text-muted-foreground text-sm">
            {tWorkspace('previewNoMilestoneSelected')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
