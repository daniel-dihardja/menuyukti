'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
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
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import {
  WORKFLOW_IMPORT_PRESETS,
  parsePresetIdFromSelectionKey,
  presetSelectionKey,
} from '@/lib/workflows/presets'
import { routes } from '@/lib/routes'
import { importWorkflowPayload } from '@/lib/api/client-fetch'

const EXPORT_KEY_PREFIX = 'export:' as const

function exportSelectionKey(id: string): string {
  return `${EXPORT_KEY_PREFIX}${id}`
}

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
  const t = useTranslations('analytics.workflows.chat')
  const format = useFormatter()
  const router = useRouter()

  const [exportsList, setExportsList] = useState<WorkflowExportListItem[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedImportKey, setSelectedImportKey] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSelectedImportKey(null)
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

  const resolvePayloadForImport = useCallback((): unknown | null => {
    if (selectedImportKey === null) {
      return null
    }
    const presetId = parsePresetIdFromSelectionKey(selectedImportKey)
    if (presetId !== null) {
      const preset = WORKFLOW_IMPORT_PRESETS.find((p) => p.id === presetId)
      return preset?.payload ?? null
    }
    if (selectedImportKey.startsWith(EXPORT_KEY_PREFIX)) {
      const exportId = selectedImportKey.slice(EXPORT_KEY_PREFIX.length)
      const row = exportsList.find((e) => e.id === exportId)
      return row?.payload ?? null
    }
    return null
  }, [exportsList, selectedImportKey])

  const handleImport = useCallback(async () => {
    const payload = resolvePayloadForImport()
    if (payload == null) {
      return
    }
    setImporting(true)
    setImportError(null)
    try {
      const newId = await importWorkflowPayload(workflowId, payload, t('importError'))
      onOpenChange(false)
      router.push(routes.workflows.detail(newId))
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('importError'))
    } finally {
      setImporting(false)
    }
  }, [workflowId, onOpenChange, router, resolvePayloadForImport, t])

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

  const canImport =
    selectedImportKey !== null &&
    !importing &&
    (parsePresetIdFromSelectionKey(selectedImportKey) !== null ||
      (selectedImportKey.startsWith(EXPORT_KEY_PREFIX) &&
        exportsList.some((e) => exportSelectionKey(e.id) === selectedImportKey)))

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[min(90vh,560px)] max-w-lg flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle>{t('importDialogTitle')}</DialogTitle>
          <DialogDescription>{t('importDialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-6 py-4">
          <ScrollArea className="h-[min(360px,52vh)] pr-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-medium text-foreground text-sm" id="import-presets-heading">
                  {t('importDialogPresetsHeading')}
                </h3>
                <ul aria-labelledby="import-presets-heading" className="flex flex-col gap-2">
                  {WORKFLOW_IMPORT_PRESETS.map((preset) => {
                    const key = presetSelectionKey(preset.id)
                    const title = titleFromPayload(preset.payload, t('importDialogFallbackName'))
                    const count = milestoneCountFromPayload(preset.payload)
                    const selected = selectedImportKey === key
                    return (
                      <li key={preset.id}>
                        <button
                          aria-pressed={selected}
                          className={cn(
                            'w-full rounded-lg border p-3 text-left transition-colors',
                            'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            selected
                              ? 'border-primary bg-accent/50 ring-1 ring-primary'
                              : 'border-border bg-card',
                          )}
                          onClick={() => setSelectedImportKey(key)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground text-sm">{title}</span>
                            <Badge variant="secondary">{t('importDialogPresetBadge')}</Badge>
                          </div>
                          <div className="mt-1 text-muted-foreground text-xs">
                            {t('importDialogMilestoneCount', { count })}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <h3 className="font-medium text-foreground text-sm" id="import-exports-heading">
                  {t('importDialogExportsHeading')}
                </h3>
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
                  <p className="text-muted-foreground text-sm">{t('importDialogExportsEmpty')}</p>
                ) : (
                  <ul aria-labelledby="import-exports-heading" className="flex flex-col gap-2">
                    {exportsList.map((row) => {
                      const key = exportSelectionKey(row.id)
                      const title = titleFromPayload(row.payload, t('importDialogFallbackName'))
                      const count = milestoneCountFromPayload(row.payload)
                      const dateLabel = formatExportDate(row.updatedAt ?? row.createdAt)
                      const selected = selectedImportKey === key
                      return (
                        <li key={row.id}>
                          <button
                            aria-pressed={selected}
                            className={cn(
                              'w-full rounded-lg border p-3 text-left transition-colors',
                              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              selected
                                ? 'border-primary bg-accent/50 ring-1 ring-primary'
                                : 'border-border bg-card',
                            )}
                            onClick={() => setSelectedImportKey(key)}
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
                )}
              </div>
            </div>
          </ScrollArea>
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
          <Button disabled={!canImport} onClick={() => void handleImport()} type="button">
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
