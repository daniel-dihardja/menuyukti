'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardHeader } from '@workspace/ui/components/card'
import { cn } from '@workspace/ui/lib/utils'

import type { StoryLineupMilestoneData, StoryLineupStory } from '@/lib/graphql/node-schemas'
import { formatPreviewDateString } from '@/lib/format-preview-date'

import {
  MilestonePreviewListDetailShell,
  MilestonePreviewListRow,
  useMilestonePreviewSelection,
} from './milestone-preview-list-detail'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneStoryLineupDataPreviewProps = {
  data: StoryLineupMilestoneData
}

function formatStorySchedule(
  story: StoryLineupStory,
  formatDate: (value: string) => string,
): string | undefined {
  if (!story.date?.trim()) {
    return undefined
  }
  const datePart = formatDate(story.date)
  return story.time?.trim() ? `${datePart} · ${story.time}` : datePart
}

function StoryDetail({
  story,
  labels,
  formatDate,
  formatInterval,
}: {
  story: StoryLineupStory
  labels: {
    fixdate: string
    publicHoliday: string
    userReview: string
    intervalLabel: string
    dateLabel: string
    timeLabel: string
    holidayLabel: string
  }
  formatDate: (value: string) => string
  formatInterval: (weeks: number) => string
}) {
  const schedule = formatStorySchedule(story, formatDate)

  const hasBadges =
    story.fixdate || story.reason === 'public_holiday' || story.reason === 'user_review'

  return (
    <Card className="gap-3 py-4 shadow-none">
      {hasBadges ? (
        <CardHeader className="px-4 pb-0">
          <div className="flex flex-wrap items-center gap-2">
            {story.fixdate ? <Badge variant="secondary">{labels.fixdate}</Badge> : null}
            {story.reason === 'public_holiday' ? (
              <Badge variant="outline">{labels.publicHoliday}</Badge>
            ) : null}
            {story.reason === 'user_review' ? (
              <Badge variant="outline">{labels.userReview}</Badge>
            ) : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn('flex flex-col gap-2 px-4', hasBadges ? 'pt-0' : 'pt-4')}>
        {schedule ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{labels.dateLabel}:</span> {schedule}
          </p>
        ) : null}
        {story.time?.trim() && !story.date?.trim() ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{labels.timeLabel}:</span> {story.time}
          </p>
        ) : null}
        {story.intervalWeeks != null && story.intervalWeeks > 0 ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{labels.intervalLabel}:</span>{' '}
            {formatInterval(story.intervalWeeks)}
          </p>
        ) : null}
        {story.holidayName ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{labels.holidayLabel}:</span> {story.holidayName}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function MilestoneStoryLineupDataPreview({ data }: MilestoneStoryLineupDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const locale = useLocale()
  const formatDate = (value: string) => formatPreviewDateString(value, locale)

  const labels = useMemo(
    () => ({
      heading: t('milestoneStoryLineupPreviewHeading'),
      empty: t('milestoneStoryLineupPreviewEmpty'),
      sourceDates: t('milestoneStoryLineupPreviewSourceDates'),
      fixdate: t('milestoneStoryLineupPreviewFixdateBadge'),
      publicHoliday: t('milestoneStoryLineupPreviewPublicHolidayBadge'),
      userReview: t('milestoneStoryLineupPreviewUserReviewBadge'),
      intervalLabel: t('milestoneStoryLineupPreviewIntervalLabel'),
      dateLabel: t('milestoneStoryLineupPreviewDateLabel'),
      timeLabel: t('milestoneStoryLineupPreviewTimeLabel'),
      holidayLabel: t('milestoneStoryLineupPreviewHolidayLabel'),
    }),
    [t],
  )

  const formatInterval = (weeks: number) => t('milestoneStoryLineupPreviewIntervalValue', { weeks })

  const listItems = useMemo(
    () => (data.stories ?? []).map((story) => ({ id: story.id, story })),
    [data.stories],
  )
  const stories = listItems.map((item) => item.story)
  const { selectedId, select, clear } = useMilestonePreviewSelection(listItems)

  const selectedStory = listItems.find((item) => item.id === selectedId)?.story

  const viewDetailsLabel = t('milestoneLineupPreviewViewDetails')
  const backLabel = t('milestoneLineupPreviewBackToList')

  return (
    <div className="flex flex-col gap-4">
      <p className={mp.sectionTitle}>{labels.heading}</p>
      {data.sourceDatesTitle ? (
        <p className={mp.bodySmall}>
          <span className={mp.rowKey}>{labels.sourceDates}:</span> {data.sourceDatesTitle}
        </p>
      ) : null}
      {stories.length === 0 ? (
        <p className={mp.body}>{labels.empty}</p>
      ) : (
        <MilestonePreviewListDetailShell
          selectedId={selectedId}
          backLabel={backLabel}
          detailTitleId="story-lineup-detail-title"
          detailTitle={selectedStory?.title ?? labels.heading}
          onBack={clear}
          list={
            <div className="flex flex-col gap-2">
              {listItems.map(({ id, story }) => {
                const schedule = formatStorySchedule(story, formatDate)
                return (
                  <MilestonePreviewListRow
                    key={id}
                    title={story.title}
                    description={schedule}
                    meta={
                      <>
                        {story.fixdate ? <Badge variant="secondary">{labels.fixdate}</Badge> : null}
                        {story.reason === 'public_holiday' ? (
                          <Badge variant="outline">{labels.publicHoliday}</Badge>
                        ) : null}
                        {story.reason === 'user_review' ? (
                          <Badge variant="outline">{labels.userReview}</Badge>
                        ) : null}
                      </>
                    }
                    viewDetailsLabel={viewDetailsLabel}
                    onSelect={() => select(id)}
                  />
                )
              })}
            </div>
          }
          detail={
            selectedStory ? (
              <StoryDetail
                story={selectedStory}
                labels={labels}
                formatDate={formatDate}
                formatInterval={formatInterval}
              />
            ) : null
          }
        />
      )}
    </div>
  )
}
