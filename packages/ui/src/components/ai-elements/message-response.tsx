'use client'

import type { ComponentProps } from 'react'

import { cn } from '@workspace/ui/lib/utils'
import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { memo } from 'react'
import { Streamdown } from 'streamdown'

export type MessageResponseProps = ComponentProps<typeof Streamdown>

/** Code + math + CJK only — mermaid stays out of the default chat markdown path. */
const streamdownPlugins = { cjk, code, math }

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn('size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
)

MessageResponse.displayName = 'MessageResponse'
