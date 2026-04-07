'use client'

import { Check, FileEdit } from 'lucide-react'

import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

export type FieldSaveStatusVariant = 'saved' | 'unsaved' | 'saving'

export type FieldSaveStatusProps = {
  status: FieldSaveStatusVariant
  messages: {
    saving: string
    saved: string
    unsaved: string
  }
  className?: string
}

export function FieldSaveStatus({ status, messages, className }: FieldSaveStatusProps) {
  const label =
    status === 'saving' ? messages.saving : status === 'unsaved' ? messages.unsaved : messages.saved

  const toneClass =
    status === 'unsaved'
      ? 'text-amber-600 dark:text-amber-500'
      : status === 'saving'
        ? 'text-muted-foreground'
        : 'text-muted-foreground'

  const inner =
    status === 'saving' ? (
      <Spinner aria-hidden className="size-3.5 shrink-0" />
    ) : status === 'unsaved' ? (
      <FileEdit aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
    ) : (
      <Check aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
    )

  return (
    <div
      aria-live="polite"
      className={cn('inline-flex items-center gap-1.5', toneClass, className)}
      role="status"
    >
      {inner}
      <span className="text-xs leading-none">{label}</span>
    </div>
  )
}
