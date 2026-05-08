'use client'

import { Button } from '@workspace/ui/components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { CircleHelp } from 'lucide-react'

export type CampaignBriefPreviewHelpIconProps = {
  helpText: string
  ariaLabel: string
}

/** Help trigger for Campaign brief preview; render inside a single `TooltipProvider` ancestor. */
export function CampaignBriefPreviewHelpIcon({
  helpText,
  ariaLabel,
}: CampaignBriefPreviewHelpIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={ariaLabel}
        >
          <CircleHelp className="size-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty" side="top">
        <p>{helpText}</p>
      </TooltipContent>
    </Tooltip>
  )
}
