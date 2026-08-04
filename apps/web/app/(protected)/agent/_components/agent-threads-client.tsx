'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'

import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'
import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { fetchAnalyticsList } from '@/lib/api/client-fetch'
import {
  createAgentThread,
  listAgentThreads,
  removeAgentThread,
  type AgentThreadRecord,
} from '@/lib/chat/agent-thread-registry'
import { routes } from '@/lib/routes'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import { AgentThreadTitleEditor } from './agent-thread-title-editor'
import { useAgentThreadTitleEdit } from './use-agent-thread-title-edit'

type Branch = {
  id: number
  name: string
}

type Props = {
  branches: Branch[]
  initialLocationId: number | null
  initialAnalyticsRuns: Array<{ id: number; name: string }>
}

export function AgentThreadsClient({ branches, initialLocationId, initialAnalyticsRuns }: Props) {
  const t = useTranslations('agentChat')
  const router = useRouter()
  const { locationId, setLocationId } = useAnalytics()
  const [threads, setThreads] = useState<AgentThreadRecord[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [analyticsRuns, setAnalyticsRuns] =
    useState<Array<{ id: number; name: string }>>(initialAnalyticsRuns)
  const [analyticsRunId, setAnalyticsRunId] = useState<number | null>(() => {
    const first = initialAnalyticsRuns[0]
    return first ? first.id : null
  })
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const {
    editingId,
    draftTitle,
    editContainerRef,
    cancelEdit,
    startEdit,
    saveEdit,
    onDraftKeyDown,
    setDraftTitle,
  } = useAgentThreadTitleEdit()

  useEffect(() => {
    if (initialLocationId !== null) {
      setLocationId(initialLocationId)
    }
  }, [initialLocationId, setLocationId])

  useEffect(() => {
    if (initialLocationId !== null) return
    if (locationId !== null) {
      if (branches.length > 0 && !branches.some((b) => b.id === locationId)) {
        setLocationId(null)
      }
      return
    }
    if (branches.length !== 1) return
    const [onlyBranch] = branches
    if (!onlyBranch) return
    setLocationId(onlyBranch.id)
  }, [locationId, initialLocationId, branches, setLocationId])

  useEffect(() => {
    if (locationId === null) return
    if (locationId === initialLocationId) return
    router.replace(routes.agentWithLocation(locationId))
  }, [locationId, initialLocationId, router])

  useEffect(() => {
    setThreads(listAgentThreads())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (locationId === null) {
      setAnalyticsRuns([])
      setAnalyticsRunId(null)
      return
    }
    if (locationId === initialLocationId) {
      setAnalyticsRuns(initialAnalyticsRuns)
      setAnalyticsRunId((prev) => {
        if (prev !== null && initialAnalyticsRuns.some((r) => r.id === prev)) return prev
        return initialAnalyticsRuns[0]?.id ?? null
      })
      return
    }
    let cancelled = false
    void fetchAnalyticsList(locationId)
      .then((runs) => {
        if (cancelled) return
        setAnalyticsRuns(runs)
        setAnalyticsRunId(runs[0]?.id ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setAnalyticsRuns([])
        setAnalyticsRunId(null)
      })
    return () => {
      cancelled = true
    }
  }, [locationId, initialLocationId, initialAnalyticsRuns])

  const visibleThreads = useMemo(() => {
    if (locationId === null) return []
    return threads.filter((t) => t.locationId === locationId)
  }, [threads, locationId])

  const handleNewChat = useCallback(() => {
    if (locationId === null) return
    const record = createAgentThread({
      locationId,
      analyticsRunId,
    })
    setThreads(listAgentThreads())
    router.push(routes.agentThread(record.id))
  }, [locationId, analyticsRunId, router])

  const handleRemove = useCallback(
    (id: string) => {
      removeAgentThread(id)
      setThreads(listAgentThreads())
      setPendingRemoveId(null)
      if (editingId === id) cancelEdit()
      void fetch(`/api/chat/history?agentThreadId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => {
        /* best-effort */
      })
    },
    [cancelEdit, editingId],
  )

  const confirmRemove = useCallback(() => {
    if (!pendingRemoveId) return
    handleRemove(pendingRemoveId)
  }, [handleRemove, pendingRemoveId])

  const handleStartEdit = useCallback(
    (thread: AgentThreadRecord) => {
      startEdit(thread.id, thread.title)
    },
    [startEdit],
  )

  const handleSaveEdit = useCallback(() => {
    if (editingId === null) return
    const current = threads.find((thread) => thread.id === editingId)
    saveEdit(current?.title)
    setThreads(listAgentThreads())
  }, [editingId, saveEdit, threads])

  const handleDraftKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (editingId === null) return
      const current = threads.find((thread) => thread.id === editingId)
      onDraftKeyDown(e, current?.title)
      if (e.key === 'Enter') {
        setThreads(listAgentThreads())
      }
    },
    [editingId, onDraftKeyDown, threads],
  )

  const threadDisplayTitle = useCallback(
    (thread: AgentThreadRecord) =>
      thread.title?.trim() || t('untitledThread', { id: thread.id.slice(0, 8) }),
    [t],
  )

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap">
          <LocationSelect
            branches={branches}
            label={t('locationLabel')}
            placeholder={t('locationPlaceholder')}
          />
          <Field className="max-w-xs space-y-2">
            <FieldLabel htmlFor="agent-analytics-run">{t('analyticsRunLabel')}</FieldLabel>
            <Select
              disabled={analyticsRuns.length === 0}
              onValueChange={(val) => setAnalyticsRunId(val ? Number(val) : null)}
              value={analyticsRunId !== null ? String(analyticsRunId) : undefined}
            >
              <SelectTrigger aria-label={t('analyticsRunLabel')} id="agent-analytics-run">
                <SelectValue placeholder={t('analyticsRunPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {analyticsRuns.map((run) => (
                  <SelectItem key={run.id} value={String(run.id)}>
                    {run.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button disabled={locationId === null} onClick={handleNewChat} size="lg">
          {t('newChat')}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t('threadsHeading')}</h2>
        {!hydrated ? (
          <p className="text-sm text-muted-foreground">{t('threadsLoading')}</p>
        ) : locationId === null ? (
          <p className="text-sm text-muted-foreground">{t('selectLocation')}</p>
        ) : visibleThreads.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('threadsEmpty')}</p>
        ) : (
          <div className="-mx-4 w-[calc(100%+2rem)] border-y lg:mx-0 lg:w-full lg:rounded-md lg:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('threadColumn')}</TableHead>
                  <TableHead className="w-28 text-right">{t('actionsColumn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleThreads.map((thread) => (
                  <TableRow key={thread.id}>
                    <TableCell className="min-w-0 max-w-[min(100%,24rem)]">
                      <AgentThreadTitleEditor
                        threadId={thread.id}
                        displayTitle={threadDisplayTitle(thread)}
                        editing={editingId === thread.id}
                        draftTitle={draftTitle}
                        editContainerRef={editContainerRef}
                        onDraftChange={setDraftTitle}
                        onStartEdit={() => handleStartEdit(thread)}
                        onSaveEdit={handleSaveEdit}
                        onDraftKeyDown={handleDraftKeyDown}
                        editTitleAria={t('editThreadTitleAria')}
                        saveTitleAria={t('saveThreadTitleAria')}
                        titleLabel={t('threadTitleLabel')}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => setPendingRemoveId(thread.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {t('removeThread')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <AlertDialog
        open={pendingRemoveId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoveId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeThreadConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('removeThreadConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{t('removeThreadConfirmCancel')}</AlertDialogCancel>
            <Button onClick={confirmRemove} type="button" variant="destructive">
              {t('removeThreadConfirmAction')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
