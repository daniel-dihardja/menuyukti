'use client'

import { Card, CardContent } from '@workspace/ui/components/card'

import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { StoryImageArtifact } from '@/components/chat/story-image-artifact-placeholder'

/** Image-assistant side preview for ChatKit advisor (URL set via client effect). */
export function AdvisorChatKitPreview() {
  const { latestStoryImageUrl, selectedImageFormat, setSelectedImageFormat } =
    useAdvisorChatKitShell()

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden border-0 bg-transparent py-0 shadow-none hover:border-transparent">
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3 lg:p-4">
        <StoryImageArtifact
          imageUrl={latestStoryImageUrl}
          onSelectedImageFormatChange={setSelectedImageFormat}
          selectedImageFormat={selectedImageFormat}
        />
      </CardContent>
    </Card>
  )
}
