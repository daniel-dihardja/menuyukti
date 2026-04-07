'use client'

import { Maximize2, Settings } from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'

export type TimelineToolbarProps = {
  title: string
  count: number
  expandLabel: string
  settingsLabel: string
  createLabel?: string
  creatingLabel?: string
  onCreateMilestone?: () => void | Promise<void>
  creating?: boolean
  showCreate?: boolean
}

export function TimelineToolbar({
  title,
  count,
  expandLabel,
  settingsLabel,
  createLabel,
  creatingLabel,
  onCreateMilestone,
  creating,
  showCreate,
}: TimelineToolbarProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate font-semibold text-foreground text-sm">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showCreate && onCreateMilestone && createLabel && creatingLabel ? (
          <Button
            disabled={creating}
            onClick={() => void onCreateMilestone()}
            size="sm"
            type="button"
            variant="default"
          >
            {creating ? (
              <>
                <Spinner data-icon="inline-start" />
                {creatingLabel}
              </>
            ) : (
              createLabel
            )}
          </Button>
        ) : null}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label={expandLabel}
            className="size-9"
            size="icon"
            type="button"
            variant="ghost"
          >
            <Maximize2 aria-hidden data-icon="inline-start" />
          </Button>
          <Button
            aria-label={settingsLabel}
            className="size-9"
            size="icon"
            type="button"
            variant="ghost"
          >
            <Settings aria-hidden data-icon="inline-start" />
          </Button>
        </div>
      </div>
    </header>
  )
}
