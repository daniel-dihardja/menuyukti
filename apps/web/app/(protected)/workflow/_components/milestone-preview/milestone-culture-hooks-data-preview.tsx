'use client'

import { useTranslations } from 'next-intl'

import type { CultureHooksMilestoneData } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneCultureHooksDataPreviewProps = {
  data: CultureHooksMilestoneData
}

export function MilestoneCultureHooksDataPreview({ data }: MilestoneCultureHooksDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')
  return (
    <div className={mp.root}>
      <div className="space-y-2">
        <p className={mp.sectionTitle}>{t('milestoneCultureHooksPreviewLocationConcept')}</p>
        <p className={mp.body}>{data.locationConcept?.trim() || t('milestonePreviewEmptyValue')}</p>
      </div>

      <div className="space-y-2">
        <p className={mp.sectionTitle}>{t('milestoneCultureHooksPreviewTargetAudience')}</p>
        <p className={mp.body}>{data.targetAudience?.trim() || t('milestonePreviewEmptyValue')}</p>
      </div>

      <div className="space-y-3">
        <p className={mp.sectionTitle}>{t('milestoneCultureHooksPreviewIntersections')}</p>
        {data.intersections.length === 0 ? (
          <p className={mp.body}>{t('milestoneCultureHooksPreviewEmptyIntersections')}</p>
        ) : (
          <ol className={`${mp.listDecimal} space-y-4`}>
            {data.intersections.map((row, index) => (
              <li key={`${row.topic}-${index}`} className={mp.insetCard}>
                <div className="space-y-2">
                  <p className={mp.body}>
                    <span className={mp.rowKey}>{t('milestoneCultureHooksPreviewTopic')}:</span>{' '}
                    {row.topic}
                  </p>
                  <p className={mp.body}>
                    <span className={mp.rowKey}>
                      {t('milestoneCultureHooksPreviewConceptLink')}:
                    </span>{' '}
                    {row.conceptLink}
                  </p>
                  <p className={mp.body}>
                    <span className={mp.rowKey}>
                      {t('milestoneCultureHooksPreviewAudienceRelevance')}:
                    </span>{' '}
                    {row.audienceRelevance}
                  </p>
                  <p className={mp.body}>
                    <span className={mp.rowKey}>
                      {t('milestoneCultureHooksPreviewContentExample')}:
                    </span>{' '}
                    {row.contentExample}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-2">
        <p className={mp.sectionTitle}>{t('milestoneCultureHooksPreviewGuardrailCheck')}</p>
        <p className={mp.body}>{data.guardrailCheck?.trim() || t('milestonePreviewEmptyValue')}</p>
      </div>
    </div>
  )
}
