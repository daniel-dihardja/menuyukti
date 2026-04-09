'use client'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'

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
}: TimelineToolbarProps) {
  const showActions =
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
        <div className="flex shrink-0 items-center gap-2">
          {showExport && onExport && exportLabel && exportingLabel ? (
            <Button
              disabled={exporting || creating}
              onClick={() => void onExport()}
              size="sm"
              type="button"
              variant="outline"
            >
              {exporting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  {exportingLabel}
                </>
              ) : (
                exportLabel
              )}
            </Button>
          ) : null}
          {showImport && onImport && importLabel ? (
            <Button
              disabled={creating || exporting}
              onClick={() => void onImport()}
              size="sm"
              type="button"
              variant="outline"
            >
              {importLabel}
            </Button>
          ) : null}
          {showCreate && onCreateMilestone && createLabel && creatingLabel ? (
            <Button
              disabled={creating || exporting}
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
        </div>
      ) : null}
    </header>
  )
}
