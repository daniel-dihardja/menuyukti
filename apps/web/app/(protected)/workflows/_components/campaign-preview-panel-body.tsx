'use client'

import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'

import { MarkdownEditField } from '@/components/markdown-edit-field'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { useTimelineContext } from './timeline-context'

const PREVIEW_TITLE_ID = 'campaign-preview-panel-title'

export function CampaignPreviewPanelBody() {
  const tWorkspace = useTranslations('analytics.campaigns.workspace')
  const { milestones } = useTimelineContext()
  const [selectedId] = useQueryState('milestone', parseAsString)

  const selectedMilestone =
    selectedId !== null ? milestones.find((m) => m.id === selectedId) : undefined
  const showMilestonePreview = selectedMilestone !== undefined

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-dashed">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base" id={PREVIEW_TITLE_ID}>
          {tWorkspace('previewTitle')}
        </CardTitle>
        <CardDescription className="text-pretty">
          {tWorkspace('previewDescription')}
        </CardDescription>
        {showMilestonePreview ? (
          <p className="truncate font-medium text-foreground text-sm">{selectedMilestone.title}</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-0">
        {showMilestonePreview ? (
          <MarkdownEditField
            ariaLabelledBy={PREVIEW_TITLE_ID}
            id="campaign-milestone-data-preview"
            presentationLayout="fill"
            presentationOnly
            previewEmptyLabel={tWorkspace('previewMilestoneDataEmpty')}
            value={selectedMilestone.data ?? ''}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            {tWorkspace('previewNoMilestoneSelected')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
