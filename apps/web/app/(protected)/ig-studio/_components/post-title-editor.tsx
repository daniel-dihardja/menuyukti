'use client'

import Link from 'next/link'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Check, Pencil } from 'lucide-react'

import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'

import type { PostListItem } from './posts-table-types'
import { displayTitle } from './posts-table-types'

type PostTitleEditorProps = {
  post: PostListItem
  untitledLabel: string
  editingId: string | null
  draftTitle: string
  saving: boolean
  renameError: string | null
  editContainerRef: React.RefObject<HTMLDivElement | null>
  onDraftChange: (value: string) => void
  onStartEdit: (post: PostListItem) => void
  onSaveEdit: () => void
  onDraftKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  editTitleAria: string
  saveTitleAria: string
  titleLabel: string
  className?: string
}

export function PostTitleEditor({
  post,
  untitledLabel,
  editingId,
  draftTitle,
  saving,
  renameError,
  editContainerRef,
  onDraftChange,
  onStartEdit,
  onSaveEdit,
  onDraftKeyDown,
  editTitleAria,
  saveTitleAria,
  titleLabel,
  className,
}: PostTitleEditorProps) {
  const title = displayTitle(post, untitledLabel)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId !== post.id) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [editingId, post.id])

  if (editingId === post.id) {
    return (
      <div ref={editContainerRef} className={`flex flex-col gap-1 ${className ?? ''}`}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Input
            ref={inputRef}
            aria-invalid={renameError ? true : undefined}
            aria-label={titleLabel}
            name="postTitle"
            className="min-w-0 flex-1"
            disabled={saving}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onDraftKeyDown}
            value={draftTitle}
          />
          <Button
            aria-label={saveTitleAria}
            disabled={saving || draftTitle.trim().length === 0}
            onClick={() => void onSaveEdit()}
            size="icon-sm"
            type="button"
            variant="secondary"
          >
            {saving ? <Spinner /> : <Check aria-hidden />}
          </Button>
        </div>
        {renameError ? (
          <p className="text-destructive text-sm" role="alert">
            {renameError}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`flex min-w-0 items-center gap-1 ${className ?? ''}`}>
      <Link
        className="min-w-0 flex-1 truncate font-medium text-foreground underline-offset-4 hover:underline"
        href={routes.igStudioDetail(post.id)}
        title={title}
      >
        {title}
      </Link>
      <Button
        aria-label={editTitleAria}
        className="shrink-0"
        onClick={() => onStartEdit(post)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Pencil aria-hidden />
      </Button>
    </div>
  )
}
