'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@workspace/ui/components/badge'

import type { MenuTaggerItem, MenuTaggerMilestoneData } from '@/lib/graphql/node-schemas'
import { groupMenuTaggerItemsByCategory } from '@/lib/milestones/menu-tagger-items'
import {
  MENU_TAGGER_DIMENSIONS,
  computeMenuTaggerUsedTags,
  type MenuTaggerDimension,
} from '@/lib/milestones/menu-tagger-taxonomy'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneMenuTaggerDataPreviewProps = {
  data: MenuTaggerMilestoneData
}

function dimensionLabelKey(dimension: MenuTaggerDimension): string {
  return `milestoneMenuTaggerPreviewDimension_${dimension}`
}

function TagBadgeList({ values }: { values: string[] }) {
  if (values.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <Badge key={value} variant="secondary">
          {value}
        </Badge>
      ))}
    </div>
  )
}

function ItemTagsRow({ item }: { item: MenuTaggerItem }) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <li className={mp.insetCard}>
      <p className={`${mp.body} font-medium text-foreground`}>{item.name}</p>
      <div className="mt-2 space-y-1.5">
        {MENU_TAGGER_DIMENSIONS.map((dimension) => {
          const values =
            dimension === 'kind' ? [item.tags.kind] : (item.tags[dimension] as string[])
          if (values.length === 0) {
            return null
          }
          return (
            <div key={dimension} className="flex flex-wrap items-center gap-1.5">
              <span className={`${mp.rowKey} shrink-0`}>{t(dimensionLabelKey(dimension))}:</span>
              <TagBadgeList values={values} />
            </div>
          )
        })}
      </div>
    </li>
  )
}

export function MilestoneMenuTaggerDataPreview({ data }: MilestoneMenuTaggerDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')

  const usedTags = useMemo(() => {
    if (data.usedTags && Object.keys(data.usedTags).length > 0) {
      return data.usedTags
    }
    return computeMenuTaggerUsedTags(data.items)
  }, [data.items, data.usedTags])

  const grouped = useMemo(
    () => groupMenuTaggerItemsByCategory(data.items, t('milestoneMenuTaggerPreviewUncategorized')),
    [data.items, t],
  )

  return (
    <div className={mp.root}>
      {data.sourcePromotionCandidatesTitle?.trim() ? (
        <div className="space-y-1">
          <p className={mp.sectionTitle}>{t('milestoneMenuTaggerPreviewSourceTitle')}</p>
          <p className={mp.body}>{data.sourcePromotionCandidatesTitle.trim()}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className={mp.sectionTitle}>{t('milestoneMenuTaggerPreviewUsedTags')}</p>
        {data.items.length === 0 ? (
          <p className={mp.body}>{t('milestoneMenuTaggerPreviewEmptyItems')}</p>
        ) : (
          <div className="space-y-3">
            {MENU_TAGGER_DIMENSIONS.map((dimension) => {
              const values = usedTags[dimension]
              return (
                <div key={dimension} className="space-y-1.5">
                  <p className={mp.rowKey}>{t(dimensionLabelKey(dimension))}</p>
                  {values.length === 0 ? (
                    <p className={mp.body}>{t('milestonePreviewEmptyValue')}</p>
                  ) : (
                    <TagBadgeList values={values} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className={mp.sectionTitle}>{t('milestoneMenuTaggerPreviewTaggedItems')}</p>
        {grouped.length === 0 ? (
          <p className={mp.body}>{t('milestoneMenuTaggerPreviewEmptyItems')}</p>
        ) : (
          grouped.map(([category, bucket]) => (
            <div key={category} className="space-y-3">
              <p className={`${mp.body} font-semibold text-foreground`}>{category}</p>
              {bucket.star.length > 0 ? (
                <div className="space-y-2">
                  <p className={mp.rowKey}>{t('milestoneMenuTaggerPreviewStarItems')}</p>
                  <ul className={`${mp.listDecimal} space-y-2`}>
                    {bucket.star.map((item) => (
                      <ItemTagsRow key={`star-${item.name}`} item={item} />
                    ))}
                  </ul>
                </div>
              ) : null}
              {bucket.puzzle.length > 0 ? (
                <div className="space-y-2">
                  <p className={mp.rowKey}>{t('milestoneMenuTaggerPreviewPuzzleItems')}</p>
                  <ul className={`${mp.listDecimal} space-y-2`}>
                    {bucket.puzzle.map((item) => (
                      <ItemTagsRow key={`puzzle-${item.name}`} item={item} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {data.notes?.trim() ? (
        <div className="space-y-2">
          <p className={mp.sectionTitle}>{t('milestoneMenuTaggerPreviewNotes')}</p>
          <p className={mp.body}>{data.notes.trim()}</p>
        </div>
      ) : null}
    </div>
  )
}
