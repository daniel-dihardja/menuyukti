'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'

import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'

import { MarkdownMessage } from '@/components/markdown-message'
import { getMilestoneHelpDescription } from '@/lib/milestones/milestone-help-description'
import { milestonePresetIconFor } from '@/lib/milestones/preset-definitions'

import { MilestoneDataPreview } from './milestone-preview/milestone-data-preview'
import { InstagramItemsArtifact } from './instagram-items/instagram-items-artifact'
import { useTimelineWorkspaceState } from './timeline-context'

const PREVIEW_TITLE_ID = 'workflow-preview-panel-title'

export function WorkflowPreviewPanelBody() {
  const tChat = useTranslations('analytics.workflows.chat')
  const {
    milestoneState: { milestones },
  } = useTimelineWorkspaceState()
  const [selectedId] = useQueryState('milestone', parseAsString)

  const selectedMilestone =
    selectedId !== null ? milestones.find((m) => m.id === selectedId) : undefined
  const showMilestonePreview = selectedMilestone !== undefined
  const milestoneDescription = useMemo(
    () => (selectedMilestone ? getMilestoneHelpDescription(selectedMilestone, tChat) : ''),
    [selectedMilestone, tChat],
  )
  const MilestoneIcon = selectedMilestone
    ? milestonePresetIconFor(selectedMilestone.presetId)
    : null

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-dashed">
      {showMilestonePreview ? (
        <CardHeader className="shrink-0">
          <CardTitle
            className="flex items-center gap-2 text-balance font-semibold text-xl tracking-tight"
            id={PREVIEW_TITLE_ID}
          >
            {MilestoneIcon ? (
              <MilestoneIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            ) : null}
            <span>{selectedMilestone.title}</span>
          </CardTitle>
          <MarkdownMessage
            className="prose-base prose-p:my-1 prose-p:text-muted-foreground prose-strong:font-medium prose-strong:text-foreground"
            content={milestoneDescription}
          />
        </CardHeader>
      ) : null}
      <CardContent
        className={
          showMilestonePreview
            ? 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pt-0'
            : 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pt-4'
        }
      >
        {showMilestonePreview ? (
          <MilestoneDataPreview milestone={selectedMilestone} />
        ) : (
          <InstagramItemsArtifact />
        )}
      </CardContent>
    </Card>
  )
}
