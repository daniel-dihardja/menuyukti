'use client'

import type { ComponentProps } from 'react'

import { CollapsibleContent } from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'
import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { memo } from 'react'
import { Streamdown } from 'streamdown'

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children: string
}

/** Code + math + CJK only — mermaid stays out of the default chat reasoning path. */
const streamdownPlugins = { cjk, code, math }

export const ReasoningContent = memo(({ className, children, ...props }: ReasoningContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-4 text-sm',
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className,
    )}
    {...props}
  >
    <Streamdown plugins={streamdownPlugins}>{children}</Streamdown>
  </CollapsibleContent>
))

ReasoningContent.displayName = 'ReasoningContent'
