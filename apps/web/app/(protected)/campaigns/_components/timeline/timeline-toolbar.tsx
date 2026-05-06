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
  /** Toolbar buttons; omit by not rendering (composition over show* flags). */
  actions?: ReactNode
  /** Rendered after action buttons (e.g. preview toggle). */
  trailingSlot?: ReactNode
}

export function TimelineToolbar({ title, count, actions, trailingSlot }: TimelineToolbarProps) {
  const showActions = Boolean(actions) || Boolean(trailingSlot)

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b px-2 py-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate font-semibold text-foreground text-sm">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {showActions ? (
        <TooltipProvider delayDuration={300}>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {trailingSlot}
          </div>
        </TooltipProvider>
      ) : null}
    </header>
  )
}

export function TimelineToolbarExportButton({
  exportLabel,
  exportingLabel,
  onExport,
  exporting,
  creating,
}: {
  exportLabel: string
  exportingLabel: string
  onExport: () => void | Promise<void>
  exporting: boolean
  creating: boolean
}) {
  return (
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
  )
}

export function TimelineToolbarImportButton({
  importLabel,
  onImport,
  creating,
  exporting,
}: {
  importLabel: string
  onImport: () => void | Promise<void>
  creating: boolean
  exporting: boolean
}) {
  return (
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
  )
}

export function TimelineToolbarCreateButton({
  createLabel,
  creatingLabel,
  onCreateMilestone,
  creating,
  exporting,
}: {
  createLabel: string
  creatingLabel: string
  onCreateMilestone: () => boolean | Promise<boolean>
  creating: boolean
  exporting: boolean
}) {
  return (
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
  )
}
