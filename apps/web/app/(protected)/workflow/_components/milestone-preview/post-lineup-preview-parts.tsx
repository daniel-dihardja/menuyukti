'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'

import type { PostLineupPost } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

const ROLE_BADGE_CLASS = {
  star: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
  puzzle:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
} as const

export function postIntentBadgeLabel(
  intent: PostLineupPost['intent'],
  t: ReturnType<typeof useTranslations>,
): string {
  if (intent === 'weekday_lunch_post') {
    return t('milestonePostLineupPreviewWeeklyLunchBadge')
  }
  return t('milestonePostLineupPreviewPinnedBadge')
}

export function PostLineupPostBadges({
  post,
  showScheduledDate = false,
}: {
  post: PostLineupPost
  showScheduledDate?: boolean
}) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{t('milestonePostLineupPreviewCarouselBadge')}</Badge>
      <Badge variant="secondary">{postIntentBadgeLabel(post.intent, t)}</Badge>
      {showScheduledDate && post.date?.trim() ? (
        <Badge variant="outline">
          {t('milestonePostLineupPreviewScheduledDate', { date: post.date })}
        </Badge>
      ) : null}
    </div>
  )
}

export function PostLineupSlideCard({
  slideNumber,
  dishName,
  role,
  category,
  imageBrief,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  slideNumber: number
  dishName: string
  role?: 'star' | 'puzzle'
  category?: string
  imageBrief: string
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-3">
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
      {category?.trim() ? (
        <div className="flex flex-col gap-1">
          <p className={mp.sectionTitle}>{t('milestonePostLineupPreviewCategory')}</p>
          <p className={mp.body}>{category.trim()}</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className={mp.sectionTitle}>{t('milestonePostLineupPreviewImageBrief')}</p>
        <p className={mp.body}>{imageBrief}</p>
      </div>
    </div>
  )
}

export function PostLineupSlides({
  post,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  post: PostLineupPost
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {post.slides.map((slide, slideIndex) => (
        <PostLineupSlideCard
          key={`${slide.dishName}-${slideIndex}`}
          slideNumber={slideIndex + 1}
          dishName={slide.dishName}
          role={slide.role}
          category={slide.category}
          imageBrief={slide.imageBrief}
          roleStarLabel={roleStarLabel}
          rolePuzzleLabel={rolePuzzleLabel}
        />
      ))}
    </div>
  )
}
