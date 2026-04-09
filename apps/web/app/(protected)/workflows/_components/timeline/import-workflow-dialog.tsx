'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import { routes } from '@/lib/routes'

export type WorkflowExportListItem = {
  id: string
  workflowId: string
  locationId: number
  payload: unknown
  schemaVersion: string
  createdAt: string | null
  updatedAt: string | null
}

function titleFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'workflowName' in payload) {
    const n = (payload as { workflowName?: unknown }).workflowName
    if (typeof n === 'string' && n.trim()) {
      return n.trim()
    }
  }
  return fallback
}

function milestoneCountFromPayload(payload: unknown): number {
  if (payload && typeof payload === 'object' && 'milestones' in payload) {
    const m = (payload as { milestones?: unknown }).milestones
    return Array.isArray(m) ? m.length : 0
  }
  return 0
}

export type ImportWorkflowDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
}

export function ImportWorkflowDialog({
  open,
  onOpenChange,
  workflowId,
}: ImportWorkflowDialogProps) {
  const t = useTranslations('analytics.campaigns.chat')
  const format = useFormatter()
  const router = useRouter()

  const [exportsList, setExportsList] = useState<WorkflowExportListItem[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedExportId, setSelectedExportId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSelectedExportId(null)
      setImportError(null)
      setFetchError(null)
      setLoadState('idle')
      return
    }

    let cancelled = false
    setLoadState('loading')
    setFetchError(null)
    setExportsList([])

    void (async () => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}/exports`)
        const body = (await res.json().catch(() => null)) as {
          exports?: WorkflowExportListItem[]
          message?: string
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('importError'))
        }
        if (!cancelled) {
          setExportsList(body?.exports ?? [])
          setLoadState('idle')
        }
      } catch (err) {
        if (!cancelled) {
          setLoadState('error')
          setFetchError(err instanceof Error ? err.message : t('importError'))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, workflowId, t])

  const handleImport = useCallback(async () => {
    const row = exportsList.find((e) => e.id === selectedExportId)
    if (!row) {
      return
    }
    setImporting(true)
    setImportError(null)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: row.payload }),
      })
      const body = (await res.json().catch(() => null)) as {
        workflow?: { id: string }
        message?: string
      } | null
      if (!res.ok) {
        throw new Error(body?.message ?? t('importError'))
      }
      const newId = body?.workflow?.id
      if (newId) {
        onOpenChange(false)
        router.push(routes.workflows.detail(newId))
      } else {
        throw new Error(t('importError'))
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('importError'))
    } finally {
      setImporting(false)
    }
  }, [workflowId, exportsList, onOpenChange, router, selectedExportId, t])

  const formatExportDate = useCallback(
    (iso: string | null) => {
      if (!iso) {
        return null
      }
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) {
        return null
      }
      return format.dateTime(d, { dateStyle: 'medium', timeStyle: 'short' })
    },
    [format],
  )

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[min(90vh,560px)] max-w-lg flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle>{t('importDialogTitle')}</DialogTitle>
          <DialogDescription>{t('importDialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-6 py-4">
          {loadState === 'loading' ? (
            <div className="flex flex-col gap-3" role="status">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : loadState === 'error' && fetchError ? (
            <Alert variant="destructive">
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          ) : exportsList.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('importDialogEmpty')}</p>
          ) : (
            <ScrollArea className="h-[min(320px,50vh)] pr-3">
              <ul className="flex flex-col gap-2" role="listbox">
                {exportsList.map((row) => {
                  const title = titleFromPayload(row.payload, t('importDialogFallbackName'))
                  const count = milestoneCountFromPayload(row.payload)
                  const dateLabel = formatExportDate(row.updatedAt ?? row.createdAt)
                  const selected = selectedExportId === row.id
                  return (
                    <li key={row.id}>
                      <button
                        aria-selected={selected}
                        className={cn(
                          'w-full rounded-lg border p-3 text-left transition-colors',
                          'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selected
                            ? 'border-primary bg-accent/50 ring-1 ring-primary'
                            : 'border-border bg-card',
                        )}
                        onClick={() => setSelectedExportId(row.id)}
                        role="option"
                        type="button"
                      >
                        <div className="font-medium text-foreground text-sm">{title}</div>
                        <div className="mt-1 text-muted-foreground text-xs">
                          {t('importDialogMilestoneCount', { count })}
                          {dateLabel ? ` · ${dateLabel}` : null}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          )}
          {importError ? (
            <Alert className="mt-3" variant="destructive">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            {t('importDialogCancel')}
          </Button>
          <Button
            disabled={
              importing ||
              loadState === 'loading' ||
              loadState === 'error' ||
              exportsList.length === 0 ||
              selectedExportId === null
            }
            onClick={() => void handleImport()}
            type="button"
          >
            {importing ? (
              <>
                <Spinner data-icon="inline-start" />
                {t('importingMilestones')}
              </>
            ) : (
              t('importDialogConfirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
