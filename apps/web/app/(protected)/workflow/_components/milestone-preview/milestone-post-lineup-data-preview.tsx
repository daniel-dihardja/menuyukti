'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'

import type { PostLineupMilestoneData, PostLineupPost } from '@/lib/graphql/node-schemas'

import { MilestonePreviewHelpTrigger } from './milestone-preview-help-trigger'
import {
  MilestonePreviewListDetailShell,
  MilestonePreviewListRow,
  useMilestonePreviewSelection,
} from './milestone-preview-list-detail'
import { milestonePreviewTypography as mp } from './milestone-preview-typography'
import {
  postIntentBadgeLabel,
  PostLineupPostBadges,
  PostLineupSlides,
} from './post-lineup-preview-parts'

export type MilestonePostLineupDataPreviewProps = {
  data: PostLineupMilestoneData
}

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
    <Card className="gap-3 py-4 shadow-none">
      <CardHeader className="flex flex-col gap-2 px-4 pb-0">
        <CardTitle className="text-base">
          {t('milestonePostLineupPreviewPostTitle', { number: index + 1, title: post.title })}
        </CardTitle>
        <PostLineupPostBadges post={post} showScheduledDate />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 pt-0">
        <PostLineupSlides
          post={post}
          roleStarLabel={roleStarLabel}
          rolePuzzleLabel={rolePuzzleLabel}
        />
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

export function MilestonePostLineupDataPreview({ data }: MilestonePostLineupDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')

  const slideCount = useMemo(
    () => data.posts.reduce((total, post) => total + post.slides.length, 0),
    [data.posts],
  )

  const listItems = useMemo(() => data.posts.map((post) => ({ id: post.id, post })), [data.posts])
  const { selectedId, select, clear } = useMilestonePreviewSelection(listItems)

  const selectedIndex = listItems.findIndex((item) => item.id === selectedId)
  const selectedPost = selectedIndex >= 0 ? listItems[selectedIndex]?.post : undefined

  const formatHelpAriaLabel = (sectionTitle: string) =>
    t('milestoneCampaignBriefPreviewHelpLearnMoreAria', { section: sectionTitle })

  const viewDetailsLabel = t('milestoneLineupPreviewViewDetails')
  const backLabel = t('milestoneLineupPreviewBackToList')
  const roleStarLabel = t('milestonePostLineupPreviewRoleStar')
  const rolePuzzleLabel = t('milestonePostLineupPreviewRolePuzzle')

  if (data.posts.length === 0) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4">
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
  const detailTitle = selectedPost?.title ?? postsHelpTitle

  return (
    <div className="flex flex-col gap-4">
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
        {data.sourceMenuClustererTitle ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestonePostLineupPreviewSourceTitle')}:</span>{' '}
            {data.sourceMenuClustererTitle}
          </p>
        ) : null}
        {data.sourceCampaignBriefTitle ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>
              {t('milestonePostLineupPreviewSourceCampaignBriefTitle')}:
            </span>{' '}
            {data.sourceCampaignBriefTitle}
          </p>
        ) : null}
        {data.startDate && data.endDate ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestonePostLineupPreviewCampaignWindow')}:</span>{' '}
            {t('milestonePostLineupPreviewCampaignWindowValue', {
              startDate: data.startDate,
              endDate: data.endDate,
            })}
          </p>
        ) : null}
        {data.sourceDatesTitle ? (
          <p className={mp.bodySmall}>
            <span className={mp.rowKey}>{t('milestonePostLineupPreviewSourceDatesTitle')}:</span>{' '}
            {data.sourceDatesTitle}
          </p>
        ) : null}
      </div>

      <Separator />

      <MilestonePreviewListDetailShell
        selectedId={selectedId}
        backLabel={backLabel}
        detailTitleId="post-lineup-detail-title"
        detailTitle={detailTitle}
        onBack={clear}
        list={
          <div className="flex flex-col gap-2">
            {listItems.map(({ id, post }, index) => (
              <MilestonePreviewListRow
                key={id}
                title={post.title}
                description={t('milestonePostLineupPreviewPostListMeta', {
                  number: index + 1,
                  slideCount: post.slides.length,
                  hasDate: Boolean(post.date?.trim()),
                  date: post.date?.trim() ?? '',
                })}
                meta={
                  <>
                    <Badge variant="outline">{t('milestonePostLineupPreviewCarouselBadge')}</Badge>
                    <Badge variant="secondary">{postIntentBadgeLabel(post.intent, t)}</Badge>
                    {post.date?.trim() ? (
                      <Badge variant="outline">
                        {t('milestonePostLineupPreviewScheduledDate', { date: post.date })}
                      </Badge>
                    ) : null}
                  </>
                }
                viewDetailsLabel={viewDetailsLabel}
                onSelect={() => select(id)}
              />
            ))}
          </div>
        }
        detail={
          selectedPost && selectedIndex >= 0 ? (
            <PostCard
              post={selectedPost}
              index={selectedIndex}
              roleStarLabel={roleStarLabel}
              rolePuzzleLabel={rolePuzzleLabel}
            />
          ) : null
        }
      />

      <Separator />

      <NotesSection
        label={t('milestonePostLineupPreviewNotes')}
        text={data.notes?.trim() ? data.notes.trim() : t('milestonePostLineupPreviewNoNotes')}
      />
    </div>
  )
}
