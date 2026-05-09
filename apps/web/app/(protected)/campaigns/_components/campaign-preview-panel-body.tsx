'use client'

import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'

import { MilestoneDataPreview } from './milestone-preview/milestone-data-preview'
import { useTimelineWorkspaceState } from './timeline-context'

const PREVIEW_TITLE_ID = 'campaign-preview-panel-title'

export function CampaignPreviewPanelBody() {
  const tWorkspace = useTranslations('analytics.campaigns.workspace')
  const {
    milestoneState: { milestones },
  } = useTimelineWorkspaceState()
  const [selectedId] = useQueryState('milestone', parseAsString)

  const selectedMilestone =
    selectedId !== null ? milestones.find((m) => m.id === selectedId) : undefined
  const showMilestonePreview = selectedMilestone !== undefined
  const selectedTitle = selectedMilestone?.title ?? ''

  return (
    <TooltipProvider delayDuration={400}>
      <Card className="flex h-full min-h-0 flex-col overflow-hidden border-dashed">
        <CardHeader className="shrink-0">
          <CardTitle className="text-base" id={PREVIEW_TITLE_ID}>
            {tWorkspace('previewTitle')}
          </CardTitle>
          <CardDescription className="text-pretty">
            {tWorkspace('previewDescription')}
          </CardDescription>
          {showMilestonePreview ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p
                  className="line-clamp-2 cursor-default text-left font-medium text-foreground text-sm"
                  title={selectedTitle}
                >
                  {selectedTitle}
                </p>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-sm text-balance bg-foreground px-3 py-2 text-sm leading-snug text-background"
              >
                {selectedTitle}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pt-0">
          {showMilestonePreview ? (
            <MilestoneDataPreview milestone={selectedMilestone} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {tWorkspace('previewNoMilestoneSelected')}
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
