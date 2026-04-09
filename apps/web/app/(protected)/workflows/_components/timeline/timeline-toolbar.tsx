'use client'

import type { ReactNode } from 'react'

import { Download, Plus, Upload } from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'

export type TimelineToolbarProps = {
  title: string
  count: number
  createLabel?: string
  creatingLabel?: string
  onCreateMilestone?: () => void | Promise<void>
  creating?: boolean
  showCreate?: boolean
  exportLabel?: string
  exportingLabel?: string
  onExport?: () => void | Promise<void>
  exporting?: boolean
  showExport?: boolean
  importLabel?: string
  onImport?: () => void | Promise<void>
  showImport?: boolean
  /** Rendered after the create milestone button (e.g. preview toggle). */
  trailingSlot?: ReactNode
}

export function TimelineToolbar({
  title,
  count,
  createLabel,
  creatingLabel,
  onCreateMilestone,
  creating,
  showCreate,
  exportLabel,
  exportingLabel,
  onExport,
  exporting,
  showExport,
  importLabel,
  onImport,
  showImport,
  trailingSlot,
}: TimelineToolbarProps) {
  const showActions =
    Boolean(trailingSlot) ||
    (showExport && onExport && exportLabel && exportingLabel) ||
    (showImport && onImport && importLabel) ||
    (showCreate && onCreateMilestone && createLabel && creatingLabel)

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate font-semibold text-foreground text-sm">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {showActions ? (
        <TooltipProvider delayDuration={300}>
          <div className="flex shrink-0 items-center gap-2">
            {showExport && onExport && exportLabel && exportingLabel ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      aria-busy={exporting}
                      aria-label={exporting ? exportingLabel : exportLabel}
                      disabled={exporting || creating}
                      onClick={() => void onExport()}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      {exporting ? <Spinner /> : <Download aria-hidden />}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{exporting ? exportingLabel : exportLabel}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
            {showImport && onImport && importLabel ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      aria-label={importLabel}
                      disabled={creating || exporting}
                      onClick={() => void onImport()}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Upload aria-hidden />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{importLabel}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
            {showCreate && onCreateMilestone && createLabel && creatingLabel ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      aria-busy={creating}
                      aria-label={creating ? creatingLabel : createLabel}
                      disabled={creating || exporting}
                      onClick={() => void onCreateMilestone()}
                      size="icon"
                      type="button"
                      variant="default"
                    >
                      {creating ? <Spinner /> : <Plus aria-hidden />}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{creating ? creatingLabel : createLabel}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
            {trailingSlot}
          </div>
        </TooltipProvider>
      ) : null}
    </header>
  )
}
