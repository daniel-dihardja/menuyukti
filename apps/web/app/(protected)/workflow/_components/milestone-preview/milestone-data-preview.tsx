'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import type { MilestonePresetId } from '@/lib/graphql/node-schemas'
import {
  MILESTONE_PRESET_REGISTRY,
  milestonePresetIconFor,
} from '@/lib/milestones/preset-definitions'

import type { TimelineMilestone } from '../timeline/types'

import { MilestoneCampaignBriefDataPreview } from './milestone-campaign_brief-data-preview'
import { MilestoneCultureHooksDataPreview } from './milestone-culture-hooks-data-preview'
import { MilestoneDatesDataPreview } from './milestone-dates-data-preview'
import { MilestoneIgProfileDataPreview } from './milestone-ig-profile-data-preview'
import { MilestoneMenuTaggerDataPreview } from './milestone-menu-tagger-data-preview'
import { MilestoneReelLineupDataPreview } from './milestone-reel-lineup-data-preview'
import { MilestonePromotionCandidatesDataPreview } from './milestone-promotion-candidates-data-preview'
import { MilestonePostSchedulerDataPreview } from './milestone-post-scheduler-data-preview'

export type MilestoneDataPreviewProps = {
  milestone: TimelineMilestone
}

function MilestonePreviewPresetRow({ presetId }: { presetId: MilestonePresetId }) {
  const t = useTranslations('analytics.workflows.chat')
  const Icon = milestonePresetIconFor(presetId)
  const label = t(`milestonePreviewPresetBadge_${presetId}` as 'milestonePreviewPresetBadge_dates')

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  )
}

function PreviewStateMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function PresetRowWrapper({
  presetId,
  children,
}: {
  presetId: MilestonePresetId | undefined
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      {presetId ? <MilestonePreviewPresetRow presetId={presetId} /> : null}
      {children}
    </div>
  )
}

function renderParsedPreview(presetId: MilestonePresetId, data: unknown): ReactNode {
  switch (presetId) {
    case 'dates':
      return (
        <MilestoneDatesDataPreview
          data={data as Parameters<typeof MilestoneDatesDataPreview>[0]['data']}
        />
      )
    case 'restaurant_campaign_brief':
      return (
        <MilestoneCampaignBriefDataPreview
          data={data as Parameters<typeof MilestoneCampaignBriefDataPreview>[0]['data']}
        />
      )
    case 'post_scheduler':
      return (
        <MilestonePostSchedulerDataPreview
          data={data as Parameters<typeof MilestonePostSchedulerDataPreview>[0]['data']}
        />
      )
    case 'promotion_candidates':
      return (
        <MilestonePromotionCandidatesDataPreview
          data={data as Parameters<typeof MilestonePromotionCandidatesDataPreview>[0]['data']}
        />
      )
    case 'menu_tagger':
      return (
        <MilestoneMenuTaggerDataPreview
          data={data as Parameters<typeof MilestoneMenuTaggerDataPreview>[0]['data']}
        />
      )
    case 'reel_lineup':
      return (
        <MilestoneReelLineupDataPreview
          data={data as Parameters<typeof MilestoneReelLineupDataPreview>[0]['data']}
        />
      )
    case 'culture_hooks':
      return (
        <MilestoneCultureHooksDataPreview
          data={data as Parameters<typeof MilestoneCultureHooksDataPreview>[0]['data']}
        />
      )
    case 'format_mix':
      return <FormatMixPlaceholderPreview />
    case 'ig_profile':
      return (
        <MilestoneIgProfileDataPreview
          data={data as Parameters<typeof MilestoneIgProfileDataPreview>[0]['data']}
        />
      )
    default: {
      const _exhaustive: never = presetId
      return _exhaustive
    }
  }
}

function FormatMixPlaceholderPreview() {
  const t = useTranslations('analytics.workflows.chat')
  return (
    <PreviewStateMessage
      title={t('milestoneFormatMixPreviewTitle')}
      body={t('milestoneFormatMixPreviewBody')}
    />
  )
}

export function MilestoneDataPreview({ milestone }: MilestoneDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  const data = milestone.data
  const pid = milestone.presetId

  if (data == null) {
    return (
      <PresetRowWrapper presetId={pid}>
        <PreviewStateMessage
          title={t('milestonePreviewDataEmptyTitle')}
          body={t('milestonePreviewDataEmptyBody')}
        />
      </PresetRowWrapper>
    )
  }

  if (pid == null || typeof data !== 'object') {
    return (
      <PresetRowWrapper presetId={pid}>
        <PreviewStateMessage
          title={t('milestonePreviewUnsupportedTitle')}
          body={t('milestonePreviewUnsupportedBody')}
        />
      </PresetRowWrapper>
    )
  }

  const def = MILESTONE_PRESET_REGISTRY[pid]
  const parsed = def.dataSchema.safeParse(data)
  if (!parsed.success) {
    return (
      <PresetRowWrapper presetId={pid}>
        <PreviewStateMessage
          title={t('milestonePreviewDataInvalidTitle')}
          body={t('milestonePreviewDataInvalidBody')}
        />
      </PresetRowWrapper>
    )
  }

  return <PresetRowWrapper presetId={pid}>{renderParsedPreview(pid, parsed.data)}</PresetRowWrapper>
}
