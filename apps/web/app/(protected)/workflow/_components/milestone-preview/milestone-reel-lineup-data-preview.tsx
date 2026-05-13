'use client'

import { useMemo } from 'react'
import { Clapperboard } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import { cn } from '@workspace/ui/lib/utils'

import type { ReelLineupGroup, ReelLineupMilestoneData } from '@/lib/graphql/node-schemas'
import { formatMenuTaggerTagLabel } from '@/lib/milestones/menu-tagger-items'

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'
import { PRICE_LEVEL_TONE } from './promotion-candidates-preview-filters'

export type MilestoneReelLineupDataPreviewProps = {
  data: ReelLineupMilestoneData
}

const ROLE_BADGE_CLASS = {
  star: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
  puzzle:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
} as const

const STORYTELLING_BADGE_CLASS = {
  strong:
    'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100',
  weak: 'border-border bg-muted/40 text-muted-foreground',
} as const

function priceLevelLabel(
  level: 1 | 2 | 3,
  labels: { low: string; mid: string; high: string },
): string {
  if (level === 1) return labels.low
  if (level === 3) return labels.high
  return labels.mid
}

type GroupCardLabels = {
  hookBadgeLabel: string
  leadLabel: string
  groupTitle: string
  roleStarLabel: string
  rolePuzzleLabel: string
  storytellingStrongLabel: string
  storytellingWeakLabel: string
  priceLabels: { low: string; mid: string; high: string }
}

function ReelLineupGroupCard({
  group,
  labels,
}: {
  group: ReelLineupGroup
  labels: GroupCardLabels
}) {
  return (
    <div className={`${mp.insetCard} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={mp.sectionTitle}>{labels.groupTitle}</p>
        <Badge variant="outline" className="gap-1 font-normal">
          <Clapperboard className="size-3 opacity-70" aria-hidden />
          {formatMenuTaggerTagLabel(group.anchor.value)}
        </Badge>
      </div>
      <p className={`${mp.bodySmall} text-muted-foreground`}>
        {labels.leadLabel}: {group.leadName}
      </p>
      <ul className={`${mp.listDecimal} flex flex-col gap-2`}>
        {group.items.map((item) => {
          const isLead = item.position === 1
          return (
            <li
              key={`${group.id}-${item.position}-${item.name}`}
              className={cn(mp.insetCard, isLead && 'ring-1 ring-sky-200 dark:ring-sky-800')}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`${mp.body} font-medium text-foreground`}>{item.name}</p>
                  <p className={`${mp.bodySmall} text-muted-foreground`}>{item.category}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {isLead ? (
                    <Badge
                      variant="outline"
                      className="border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100"
                    >
                      {labels.hookBadgeLabel}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className={ROLE_BADGE_CLASS[item.role]}>
                    {item.role === 'star' ? labels.roleStarLabel : labels.rolePuzzleLabel}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {item.storytellingFit ? (
                  <Badge
                    variant="outline"
                    className={STORYTELLING_BADGE_CLASS[item.storytellingFit]}
                  >
                    {item.storytellingFit === 'strong'
                      ? labels.storytellingStrongLabel
                      : labels.storytellingWeakLabel}
                  </Badge>
                ) : null}
                {item.priceLevel ? (
                  <Badge
                    variant="outline"
                    className={cn('gap-1', PRICE_LEVEL_TONE[item.priceLevel])}
                  >
                    {priceLevelLabel(item.priceLevel, labels.priceLabels)}
                  </Badge>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function MilestoneReelLineupDataPreview({ data }: MilestoneReelLineupDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')

  const assignedCount = useMemo(
    () => data.groups.reduce((sum, group) => sum + group.items.length, 0),
    [data.groups],
  )

  const labels = useMemo(
    () => ({
      hookBadgeLabel: t('milestoneReelLineupPreviewHookBadge'),
      leadLabel: t('milestoneReelLineupPreviewLeadLabel'),
      roleStarLabel: t('milestoneMenuTaggerPreviewRoleStar'),
      rolePuzzleLabel: t('milestoneMenuTaggerPreviewRolePuzzle'),
      storytellingStrongLabel: t('milestonePromotionCandidatesPreviewStorytellingStrong'),
      storytellingWeakLabel: t('milestonePromotionCandidatesPreviewStorytellingWeak'),
      priceLabels: {
        low: t('milestonePromotionCandidatesPreviewPriceLevelLow'),
        mid: t('milestonePromotionCandidatesPreviewPriceLevelMid'),
        high: t('milestonePromotionCandidatesPreviewPriceLevelHigh'),
      },
    }),
    [t],
  )

  const formatHelpAriaLabel = (sectionTitle: string) =>
    t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })

  const sourceTitle = data.sourceMenuTaggerTitle?.trim() || undefined

  return (
    <div className="flex flex-col gap-5 text-base">
      <div className={`${mp.insetCard} flex flex-col gap-2`}>
        <p className={`${mp.bodySmall} text-pretty text-foreground`}>
          {t('milestoneReelLineupPreviewSummary', {
            groupCount: data.groups.length,
            assignedCount,
            unassignedCount: data.unassignedItemNames.length,
          })}
        </p>
        {sourceTitle ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestoneReelLineupPreviewSourceTitle')}:</span>{' '}
            {sourceTitle}
          </p>
        ) : null}
      </div>

      {data.groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
          <p className="text-base font-semibold text-foreground">
            {t('milestoneReelLineupPreviewEmptyTitle')}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {t('milestoneReelLineupPreviewEmptyBody')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.groups.map((group) => (
            <ReelLineupGroupCard
              key={group.id}
              group={group}
              labels={{
                ...labels,
                groupTitle: t('milestoneReelLineupPreviewGroupTitle', { id: group.id }),
              }}
            />
          ))}
        </div>
      )}

      {data.unassignedItemNames.length > 0 ? (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <div className="flex min-w-0 items-center gap-0.5">
              <p className={`min-w-0 flex-1 ${mp.sectionTitle}`}>
                {t('milestoneReelLineupPreviewUnassignedTitle')}
              </p>
              <MilestonePreviewHelpTrigger
                ariaLabel={formatHelpAriaLabel(t('milestoneReelLineupPreviewUnassignedTitle'))}
                helpText={t('milestoneReelLineupPreviewHelpUnassigned')}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {data.unassignedItemNames.map((name) => (
                <Badge key={name} variant="outline" className="font-normal">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <Separator />

      <div className="flex flex-col gap-2">
        <p className={mp.sectionTitle}>{t('milestoneReelLineupPreviewNotes')}</p>
        <p className={mp.body}>
          {data.notes?.trim() ? data.notes.trim() : t('milestoneReelLineupPreviewNoNotes')}
        </p>
      </div>
    </div>
  )
}
