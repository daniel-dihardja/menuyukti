'use client'

import { useMemo } from 'react'

import { Card, CardContent } from '@workspace/ui/components/card'

import { latestGeneratedImageUrlFromMessages } from '@/lib/chat/latest-generated-image-url'

import { StoryImageArtifact } from './story-image-artifact-placeholder'
import { useWorkflowChatMessages } from './workflow-chat-context'

export function WorkflowPreviewPanelBody() {
  const { visibleMessages } = useWorkflowChatMessages()
  const latestStoryImageUrl = useMemo(
    () => latestGeneratedImageUrlFromMessages(visibleMessages),
    [visibleMessages],
  )

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden border-0 bg-transparent py-0 shadow-none hover:border-transparent">
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3 lg:p-4">
        <StoryImageArtifact imageUrl={latestStoryImageUrl} />
      </CardContent>
    </Card>
  )
}
