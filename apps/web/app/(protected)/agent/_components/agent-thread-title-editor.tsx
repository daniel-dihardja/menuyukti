'use client'

import Link from 'next/link'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Check, Pencil } from 'lucide-react'

import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'

type AgentThreadTitleEditorProps = {
  threadId: string
  displayTitle: string
  editing: boolean
  draftTitle: string
  editContainerRef: React.RefObject<HTMLDivElement | null>
  onDraftChange: (value: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onDraftKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  editTitleAria: string
  saveTitleAria: string
  titleLabel: string
}

export function AgentThreadTitleEditor({
  threadId,
  displayTitle,
  editing,
  draftTitle,
  editContainerRef,
  onDraftChange,
  onStartEdit,
  onSaveEdit,
  onDraftKeyDown,
  editTitleAria,
  saveTitleAria,
  titleLabel,
}: AgentThreadTitleEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [editing])

  if (editing) {
    return (
      <div ref={editContainerRef} className="flex min-w-0 flex-wrap items-center gap-2">
        <Input
          ref={inputRef}
          aria-label={titleLabel}
          className="min-w-0 flex-1"
          name="threadTitle"
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onDraftKeyDown}
          value={draftTitle}
        />
        <Button
          aria-label={saveTitleAria}
          onClick={onSaveEdit}
          size="icon-sm"
          type="button"
          variant="secondary"
        >
          <Check aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Link
        className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
        href={routes.agentThread(threadId)}
        title={displayTitle}
      >
        {displayTitle}
      </Link>
      <Button
        aria-label={editTitleAria}
        className="shrink-0"
        onClick={onStartEdit}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Pencil aria-hidden />
      </Button>
    </div>
  )
}
