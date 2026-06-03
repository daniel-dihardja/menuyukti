'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'

import type { ReelLineupMilestoneData, ReelLineupReel } from '@/lib/graphql/node-schemas'

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import {
  MilestonePreviewListDetailShell,
  MilestonePreviewListRow,
  useMilestonePreviewSelection,
} from './milestone-preview-list-detail'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'
import { reelIntentBadgeLabel, ReelLineupDetailCard } from './reel-lineup-preview-parts'

export type MilestoneReelLineupDataPreviewProps = {
  data: ReelLineupMilestoneData
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
  const roleStarLabel = t('milestonePostLineupPreviewRoleStar')
  const rolePuzzleLabel = t('milestonePostLineupPreviewRolePuzzle')

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

  const reelsHelpTitle = t('milestoneReelLineupPreviewHelpReels')
  const detailTitle = selectedReel?.title ?? reelsHelpTitle

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
            {listItems.map(({ id, reel }, index) => (
              <MilestonePreviewListRow
                key={id}
                title={reel.title}
                description={
                  reel.description?.trim()
                    ? reel.description.trim()
                    : t('milestoneReelLineupPreviewReelListMeta', { number: index + 1 })
                }
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
            <ReelLineupDetailCard
              reel={selectedReel}
              index={selectedIndex}
              roleStarLabel={roleStarLabel}
              rolePuzzleLabel={rolePuzzleLabel}
            />
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
