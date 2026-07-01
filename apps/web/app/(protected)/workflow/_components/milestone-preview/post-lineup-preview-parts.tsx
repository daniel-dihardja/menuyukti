'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'

import type { PostLineupPost, PostLineupSlide } from '@/lib/graphql/node-schemas'
import {
  formatMilestonePopularityPercent,
  sortByPopularityDesc,
} from '@/lib/milestones/popularity-display'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export const LINEUP_ROLE_BADGE_CLASS = {
  star: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
  puzzle:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
} as const

export const LINEUP_STORYTELLING_BADGE_CLASS = {
  strong:
    'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100',
  weak: 'border-border bg-muted/40 text-muted-foreground',
} as const

export function postIntentBadgeLabel(
  intent: PostLineupPost['intent'],
  t: ReturnType<typeof useTranslations>,
): string {
  if (intent === 'weekday_lunch_post') {
    return t('milestonePostLineupPreviewWeeklyLunchBadge')
  }
  if (intent === 'top_five_category') {
    return t('milestonePostLineupPreviewTopFiveBadge')
  }
  return intent
}

export function PostLineupPostCopy({ post }: { post: PostLineupPost }) {
  const t = useTranslations('analytics.workflows.chat')
  const description = post.description?.trim()
  const captionGuidance = post.captionGuidance?.trim()

  if (!description && !captionGuidance) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {description ? (
        <div className="flex flex-col gap-1">
          <p className={mp.sectionTitle}>{t('milestonePostLineupPreviewDescription')}</p>
          <p className={mp.body}>{description}</p>
        </div>
      ) : null}
      {captionGuidance ? (
        <div className="flex flex-col gap-1">
          <p className={mp.sectionTitle}>{t('milestonePostLineupPreviewCaptionGuidance')}</p>
          <p className={mp.body}>{captionGuidance}</p>
        </div>
      ) : null}
    </div>
  )
}

export function PostLineupPostBadges({ post }: { post: PostLineupPost }) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{t('milestonePostLineupPreviewCarouselBadge')}</Badge>
      <Badge variant="secondary">{postIntentBadgeLabel(post.intent, t)}</Badge>
    </div>
  )
}

type PostLineupSlidesLayout = 'card' | 'bullet'

function PostLineupSlideRow({
  layout,
  slideNumber,
  slide,
  roleStarLabel,
  rolePuzzleLabel,
}: {
  layout: PostLineupSlidesLayout
  slideNumber: number
  slide: PostLineupSlide
  roleStarLabel: string
  rolePuzzleLabel: string
}) {
  const t = useTranslations('analytics.workflows.chat')
  const title =
    layout === 'bullet'
      ? slide.dishName
      : t('milestonePostLineupPreviewSlideTitle', {
          number: slideNumber,
          dishName: slide.dishName,
        })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p
        className={
          layout === 'bullet'
            ? `${mp.body} font-medium text-foreground`
            : 'text-sm font-semibold text-foreground'
        }
      >
        {title}
      </p>
      {slide.role ? (
        <Badge variant="outline" className={LINEUP_ROLE_BADGE_CLASS[slide.role]}>
          {slide.role === 'star' ? roleStarLabel : rolePuzzleLabel}
        </Badge>
      ) : null}
      {slide.category?.trim() ? (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {slide.category.trim()}
        </Badge>
      ) : null}
      {slide.storytellingFit ? (
        <Badge variant="outline" className={LINEUP_STORYTELLING_BADGE_CLASS[slide.storytellingFit]}>
          {slide.storytellingFit === 'strong'
            ? t('milestonePromotionCandidatesPreviewStorytellingStrong')
            : t('milestonePromotionCandidatesPreviewStorytellingWeak')}
        </Badge>
      ) : null}
      {typeof slide.popularity === 'number' ? (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {t('milestoneMenuClustererPreviewPopularityLabel', {
            value: formatMilestonePopularityPercent(slide.popularity),
          })}
        </Badge>
      ) : null}
      {slide.caption?.trim() ? (
        <p className={`${mp.bodySmall} w-full basis-full`}>{slide.caption.trim()}</p>
      ) : null}
    </div>
  )
}

export function PostLineupSlides({
  post,
  roleStarLabel,
  rolePuzzleLabel,
  layout = 'card',
}: {
  post: PostLineupPost
  roleStarLabel: string
  rolePuzzleLabel: string
  layout?: PostLineupSlidesLayout
}) {
  const slides = sortByPopularityDesc(
    post.slides.map((slide) => ({
      ...slide,
      name: slide.dishName,
    })),
  )

  if (layout === 'bullet') {
    return (
      <ul className={`${mp.listDisc} flex flex-col gap-2`}>
        {slides.map((slide, slideIndex) => (
          <li key={`${slide.dishName}-${slideIndex}`}>
            <PostLineupSlideRow
              layout="bullet"
              slideNumber={slideIndex + 1}
              slide={slide}
              roleStarLabel={roleStarLabel}
              rolePuzzleLabel={rolePuzzleLabel}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {slides.map((slide, slideIndex) => (
        <div
          key={`${slide.dishName}-${slideIndex}`}
          className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-3"
        >
          <PostLineupSlideRow
            layout="card"
            slideNumber={slideIndex + 1}
            slide={slide}
            roleStarLabel={roleStarLabel}
            rolePuzzleLabel={rolePuzzleLabel}
          />
        </div>
      ))}
    </div>
  )
}

export function PostLineupDetailCard({
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
    <Card className="gap-3 py-4 shadow-none">
      <CardHeader className="flex flex-col gap-2 px-4 pb-0">
        <CardTitle className="text-base">
          {t('milestonePostLineupPreviewPostTitle', { number: index + 1, title: post.title })}
        </CardTitle>
        <PostLineupPostBadges post={post} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 pt-0">
        <PostLineupPostCopy post={post} />
        <PostLineupSlides
          post={post}
          layout="bullet"
          roleStarLabel={roleStarLabel}
          rolePuzzleLabel={rolePuzzleLabel}
        />
      </CardContent>
    </Card>
  )
}
