'use client'

import { Loader2Icon } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'

type StatusKind = 'running' | 'error' | 'done'

export function AdvisorCopilotToolStatus({
  status,
  message,
}: {
  status: StatusKind
  message: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm',
        status === 'error'
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-border/70 bg-muted/40 text-foreground',
      )}
      data-testid="advisor-copilot-tool-status"
    >
      {status === 'running' ? (
        <Loader2Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 animate-spin" />
      ) : (
        <span aria-hidden className="mt-0.5 size-3.5 shrink-0 text-center text-xs font-semibold">
          {status === 'error' ? '!' : '✓'}
        </span>
      )}
      <p className="min-w-0 flex-1 leading-snug">{message}</p>
    </div>
  )
}
