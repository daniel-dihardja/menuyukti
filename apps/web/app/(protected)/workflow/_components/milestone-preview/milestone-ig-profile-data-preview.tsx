'use client'

import { useTranslations } from 'next-intl'

import type { IgProfileMilestoneData } from '@/lib/graphql/node-schemas'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export type MilestoneIgProfileDataPreviewProps = {
  data: IgProfileMilestoneData
}

export function MilestoneIgProfileDataPreview({ data }: MilestoneIgProfileDataPreviewProps) {
  const t = useTranslations('analytics.workflows.chat')

  return (
    <div className={mp.root}>
      <div className="space-y-3">
        <p className={mp.sectionTitle}>{t('milestoneIgProfilePreviewUsernames')}</p>
        {data.usernames.length === 0 ? (
          <p className={mp.body}>{t('milestoneIgProfilePreviewEmptyUsernames')}</p>
        ) : (
          <ol className={`${mp.listDecimal} space-y-2`}>
            {data.usernames.map((row, index) => (
              <li key={`${row.username}-${index}`} className={mp.body}>
                @{row.username} — {row.rationale}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-4">
        <p className={mp.sectionTitle}>{t('milestoneIgProfilePreviewBios')}</p>
        {data.bios.length === 0 ? (
          <p className={mp.body}>{t('milestoneIgProfilePreviewEmptyBios')}</p>
        ) : (
          <ol className={`${mp.listDecimal} space-y-5`}>
            {data.bios.map((bio, index) => (
              <li key={`bio-${index}`} className={mp.insetCard}>
                <div className="space-y-3">
                  <p className={mp.bodyStrong}>
                    {t('milestoneIgProfilePreviewBioVariation', { number: index + 1 })}
                  </p>
                  <p className={mp.body}>{bio.text?.trim() || t('milestonePreviewEmptyValue')}</p>
                  <div className="space-y-2">
                    <p className={mp.sectionTitle}>{t('milestoneIgProfilePreviewBioBreakdown')}</p>
                    <ul className={mp.listDisc}>
                      <li>
                        <span className={mp.rowKey}>{t('milestoneIgProfilePreviewHook')}:</span>{' '}
                        {bio.hook}
                      </li>
                      <li>
                        <span className={mp.rowKey}>
                          {t('milestoneIgProfilePreviewValueProp')}:
                        </span>{' '}
                        {bio.valueProp}
                      </li>
                      <li>
                        <span className={mp.rowKey}>{t('milestoneIgProfilePreviewCta')}:</span>{' '}
                        {bio.cta}
                      </li>
                      <li>
                        <span className={mp.rowKey}>{t('milestoneIgProfilePreviewTone')}:</span>{' '}
                        {bio.tone}
                      </li>
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
