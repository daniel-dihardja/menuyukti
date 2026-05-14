'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'

import type { PostLineupMilestoneData, PostLineupPost } from '@/lib/graphql/node-schemas'

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestonePostLineupDataPreviewProps = {
  data: PostLineupMilestoneData
}

const ROLE_BADGE_CLASS = {
  star: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
  puzzle:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
} as const

function PostCard({
  post,
  index,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  post: PostLineupPost
  index: number
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <section className="space-y-3 rounded-lg border border-border/80 bg-card/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className={mp.sectionTitle}>
          {t('milestonePostLineupPreviewPostTitle', { number: index + 1, title: post.title })}
        </p>
        <Badge variant="outline">{t('milestonePostLineupPreviewCarouselBadge')}</Badge>
        <Badge variant="secondary">{t('milestonePostLineupPreviewPinnedBadge')}</Badge>
      </div>
      <PostSlides post={post} roleStarLabel={roleStarLabel} rolePuzzleLabel={rolePuzzleLabel} />
    </section>
  )
}

function PostSlides({
  post,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  post: PostLineupPost
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  return (
    <div className="space-y-2">
      {post.slides.map((slide, slideIndex) => (
        <SlideCard
          key={`${slide.dishName}-${slideIndex}`}
          slideNumber={slideIndex + 1}
          dishName={slide.dishName}
          role={slide.role}
          imageBrief={slide.imageBrief}
          roleStarLabel={roleStarLabel}
          rolePuzzleLabel={rolePuzzleLabel}
        />
      ))}
    </div>
  )
}

function SlideCard({
  slideNumber,
  dishName,
  role,
  imageBrief,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  slideNumber: number
  dishName: string
  role?: 'star' | 'puzzle'
  imageBrief: string
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-foreground">
          {t('milestonePostLineupPreviewSlideTitle', { number: slideNumber, dishName })}
        </p>
        {role ? (
          <Badge variant="outline" className={ROLE_BADGE_CLASS[role]}>
            {role === 'star' ? roleStarLabel : rolePuzzleLabel}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-1">
        <p className={mp.sectionTitle}>{t('milestonePostLineupPreviewImageBrief')}</p>
        <p className={mp.body}>{imageBrief}</p>
      </div>
    </div>
  )
}

export function MilestonePostLineupDataPreview({ data }: MilestonePostLineupDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')

  const slideCount = useMemo(
    () => data.posts.reduce((total, post) => total + post.slides.length, 0),
    [data.posts],
  )

  const formatHelpAriaLabel = (sectionTitle: string) =>
    t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })

  if (data.posts.length === 0) {
    return (
      <div className="space-y-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
        <p className="text-base font-semibold text-foreground">
          {t('milestonePostLineupPreviewEmptyTitle')}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('milestonePostLineupPreviewEmptyBody')}
        </p>
      </div>
    )
  }

  const postsHelpTitle = t('milestonePostLineupPreviewHelpPosts')

  return (
    <div className="space-y-4">
      <div className={`${mp.insetCard} flex flex-col gap-2`}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className={`${mp.bodySmall} min-w-0 flex-1 text-pretty text-foreground`}>
            {t('milestonePostLineupPreviewSummary', {
              postCount: data.posts.length,
              slideCount,
            })}
          </p>
          <MilestonePreviewHelpTrigger
            ariaLabel={formatHelpAriaLabel(postsHelpTitle)}
            helpText={postsHelpTitle}
          />
        </div>
        {data.sourceReelLineupTitle ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestonePostLineupPreviewSourceTitle')}:</span>{' '}
            {data.sourceReelLineupTitle}
          </p>
        ) : null}
      </div>

      <Separator />

      <div className="space-y-4">
        {data.posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            index={index}
            roleStarLabel={t('milestonePostLineupPreviewRoleStar')}
            rolePuzzleLabel={t('milestonePostLineupPreviewRolePuzzle')}
          />
        ))}
      </div>

      <Separator />

      <NotesSection
        label={t('milestonePostLineupPreviewNotes')}
        text={data.notes?.trim() ? data.notes.trim() : t('milestonePostLineupPreviewNoNotes')}
      />
    </div>
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
