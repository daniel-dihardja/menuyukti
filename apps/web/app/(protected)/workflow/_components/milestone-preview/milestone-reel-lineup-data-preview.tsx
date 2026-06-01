'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'

import type { ReelLineupMilestoneData, ReelLineupReel } from '@/lib/graphql/node-schemas'

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import {
  MilestonePreviewListDetailShell,
  MilestonePreviewListRow,
  useMilestonePreviewSelection,
} from './milestone-preview-list-detail'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneReelLineupDataPreviewProps = {
  data: ReelLineupMilestoneData
}

function reelIntentBadgeLabel(
  intent: ReelLineupReel['intent'],
  t: ReturnType<typeof useTranslations<'analytics.workflows.chat'>>,
): string {
  if (intent === 'weekday_reel') {
    return t('milestoneReelLineupPreviewWeekdayBadge')
  }
  return t('milestoneReelLineupPreviewWeekendBadge')
}

function ReelCard({ reel, index }: { reel: ReelLineupReel; index: number }) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <Card className="gap-3 py-4 shadow-none">
      <CardHeader className="flex flex-col gap-2 px-4 pb-0">
        <CardTitle className="text-base">
          {t('milestoneReelLineupPreviewReelTitle', { number: index + 1, title: reel.title })}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{t('milestoneReelLineupPreviewReelBadge')}</Badge>
          <Badge variant="secondary">{reelIntentBadgeLabel(reel.intent, t)}</Badge>
          {reel.date ? (
            <Badge variant="outline">
              {t('milestoneReelLineupPreviewScheduledDate', { date: reel.date })}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 pt-0">
        <div>
          <p className={mp.sectionTitle}>{t('milestoneReelLineupPreviewDescription')}</p>
          <p className={mp.body}>{reel.description}</p>
        </div>
        <div>
          <p className={mp.sectionTitle}>{t('milestoneReelLineupPreviewExplanation')}</p>
          <p className={mp.body}>{reel.explanation}</p>
        </div>
        {reel.heroDishes && reel.heroDishes.length > 0 ? (
          <div>
            <p className={mp.sectionTitle}>{t('milestoneReelLineupPreviewHeroDishes')}</p>
            <ul className={`${mp.body} list-disc space-y-1 pl-5`}>
              {reel.heroDishes.map((dish) => (
                <li key={dish.name}>
                  {dish.name}
                  {dish.reelMoment ? ` · ${dish.reelMoment}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {reel.groupIds.length > 0 ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestoneReelLineupPreviewGroupIds')}:</span>{' '}
            {reel.groupIds.join(', ')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function NotesSection({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className={mp.sectionTitle}>{label}</p>
      <p className={mp.body}>{text}</p>
    </div>
  )
}

export function MilestoneReelLineupDataPreview({ data }: MilestoneReelLineupDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')

  const listItems = useMemo(() => data.reels.map((reel) => ({ id: reel.id, reel })), [data.reels])
  const { selectedId, select, clear } = useMilestonePreviewSelection(listItems)

  const selectedIndex = listItems.findIndex((item) => item.id === selectedId)
  const selectedReel = selectedIndex >= 0 ? listItems[selectedIndex]?.reel : undefined

  const formatHelpAriaLabel = (sectionTitle: string) =>
    t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })

  const viewDetailsLabel = t('milestoneLineupPreviewViewDetails')
  const backLabel = t('milestoneLineupPreviewBackToList')
  const reelsHelpTitle = t('milestoneReelLineupPreviewHelpReels')
  const detailTitle = selectedReel?.title ?? reelsHelpTitle

  if (data.reels.length === 0) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
        <p className="text-base font-semibold text-foreground">
          {t('milestoneReelLineupPreviewEmptyTitle')}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('milestoneReelLineupPreviewEmptyBody')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`${mp.insetCard} flex flex-col gap-2`}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className={`${mp.bodySmall} min-w-0 flex-1 text-pretty text-foreground`}>
            {t('milestoneReelLineupPreviewSummary', { reelCount: data.reels.length })}
          </p>
          <MilestonePreviewHelpTrigger
            ariaLabel={formatHelpAriaLabel(reelsHelpTitle)}
            helpText={reelsHelpTitle}
          />
        </div>
        {data.sourceMenuClustererTitle ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestoneReelLineupPreviewSourceTitle')}:</span>{' '}
            {data.sourceMenuClustererTitle}
          </p>
        ) : null}
        {data.sourceCampaignBriefTitle ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>
              {t('milestoneReelLineupPreviewSourceCampaignBriefTitle')}:
            </span>{' '}
            {data.sourceCampaignBriefTitle}
          </p>
        ) : null}
        {data.startDate && data.endDate ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestoneReelLineupPreviewCampaignWindow')}:</span>{' '}
            {t('milestoneReelLineupPreviewCampaignWindowValue', {
              startDate: data.startDate,
              endDate: data.endDate,
            })}
          </p>
        ) : null}
        {data.sourceDatesTitle ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestoneReelLineupPreviewSourceDatesTitle')}:</span>{' '}
            {data.sourceDatesTitle}
          </p>
        ) : null}
      </div>

      <Separator />

      <MilestonePreviewListDetailShell
        selectedId={selectedId}
        backLabel={backLabel}
        detailTitleId="reel-lineup-detail-title"
        detailTitle={detailTitle}
        onBack={clear}
        list={
          <div className="flex flex-col gap-2">
            {listItems.map(({ id, reel }) => (
              <MilestonePreviewListRow
                key={id}
                title={reel.title}
                description={reel.description}
                meta={
                  <>
                    <Badge variant="outline">{t('milestoneReelLineupPreviewReelBadge')}</Badge>
                    <Badge variant="secondary">{reelIntentBadgeLabel(reel.intent, t)}</Badge>
                  </>
                }
                viewDetailsLabel={viewDetailsLabel}
                onSelect={() => select(id)}
              />
            ))}
          </div>
        }
        detail={
          selectedReel && selectedIndex >= 0 ? (
            <ReelCard reel={selectedReel} index={selectedIndex} />
          ) : null
        }
      />

      <Separator />

      <NotesSection
        label={t('milestoneReelLineupPreviewNotes')}
        text={data.notes?.trim() ? data.notes.trim() : t('milestoneReelLineupPreviewNoNotes')}
      />
    </div>
  )
}
