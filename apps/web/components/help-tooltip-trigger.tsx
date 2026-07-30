'use client'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import { Button } from '@workspace/ui/components/button'
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { CircleHelp } from 'lucide-react'

export type HelpTooltipTriggerProps = {
  helpText: string
  ariaLabel: string
}

const tooltipContentClassName =
  'max-w-md text-balance bg-foreground px-3 py-2 text-sm leading-snug text-background'

/**
 * Help trigger: tooltip on desktop (min-width 1024px), popover on smaller viewports
 * so touch users can open explanations.
 */
export function HelpTooltipTrigger({ helpText, ariaLabel }: HelpTooltipTriggerProps) {
  const isDesktop = useDesktopLayout()

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
      }}
    >
      <CircleHelp className="size-4 shrink-0" aria-hidden />
    </Button>
  )

  if (isDesktop) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
          <TooltipContent side="top" className={tooltipContentClassName}>
            <p>{helpText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-w-md border-border/80 text-pretty text-sm leading-relaxed"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-popover-foreground">{helpText}</p>
      </PopoverContent>
    </Popover>
  )
}
