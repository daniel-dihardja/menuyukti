'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'

import type { StoryLineupMilestoneData, StoryLineupStory } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneStoryLineupDataPreviewProps = {
  data: StoryLineupMilestoneData
}

function StoryRow({
  story,
  index,
  fixdateLabel,
  publicHolidayLabel,
}: {
  story: StoryLineupStory
  index: number
  fixdateLabel: string
  publicHolidayLabel: string
}) {
  return (
    <div className="space-y-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className={mp.bodyStrong}>
          {index + 1}. {story.title}
        </p>
        {story.fixdate ? <Badge variant="secondary">{fixdateLabel}</Badge> : null}
        {story.reason === 'public_holiday' ? (
          <Badge variant="outline">{publicHolidayLabel}</Badge>
        ) : null}
      </div>
      {story.date ? (
        <p className={mp.bodySmall}>
          <span className={mp.rowKey}>Date:</span> {story.date}
          {story.time ? ` · ${story.time}` : ''}
        </p>
      ) : null}
      {story.holidayName ? (
        <p className={mp.bodySmall}>
          <span className={mp.rowKey}>Holiday:</span> {story.holidayName}
        </p>
      ) : null}
    </div>
  )
}

export function MilestoneStoryLineupDataPreview({ data }: MilestoneStoryLineupDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const labels = useMemo(
    () => ({
      heading: t('milestoneStoryLineupPreviewHeading'),
      empty: t('milestoneStoryLineupPreviewEmpty'),
      sourceDates: t('milestoneStoryLineupPreviewSourceDates'),
      fixdate: t('milestoneStoryLineupPreviewFixdateBadge'),
      publicHoliday: t('milestoneStoryLineupPreviewPublicHolidayBadge'),
    }),
    [t],
  )

  const stories = data.stories ?? []

  return (
    <div className="space-y-4">
      <p className={mp.sectionTitle}>{labels.heading}</p>
      {data.sourceDatesTitle ? (
        <p className={mp.bodySmall}>
          <span className={mp.rowKey}>{labels.sourceDates}:</span> {data.sourceDatesTitle}
        </p>
      ) : null}
      {stories.length === 0 ? (
        <p className={mp.body}>{labels.empty}</p>
      ) : (
        <div className="space-y-2">
          {stories.map((story, index) => (
            <StoryRow
              key={story.id}
              story={story}
              index={index}
              fixdateLabel={labels.fixdate}
              publicHolidayLabel={labels.publicHoliday}
            />
          ))}
        </div>
      )}
    </div>
  )
}
