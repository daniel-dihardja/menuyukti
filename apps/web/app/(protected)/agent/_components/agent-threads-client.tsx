'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'

import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'
import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '@/app/(protected)/analytics/_components/responsive-action-menu'
import { fetchAnalyticsList } from '@/lib/api/client-fetch'
import {
  createAgentThread,
  listAgentThreads,
  removeAgentThread,
  type AgentThreadRecord,
} from '@/lib/chat/agent-thread-registry'
import { resolveAnalyticsRunName } from '@/lib/chat/resolve-analytics-run-name'
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Skeleton } from '@workspace/ui/components/skeleton'
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

function buildThreadActionItems(args: {
  onRename: () => void
  onRemove: () => void
  renameLabel: string
  removeLabel: string
}): ResponsiveActionMenuItem[] {
  return [
    {
      id: 'rename',
      label: args.renameLabel,
      icon: Pencil,
      onSelect: args.onRename,
    },
    {
      id: 'remove',
      label: args.removeLabel,
      icon: Trash2,
      onSelect: args.onRemove,
      destructive: true,
      separatorBefore: true,
    },
  ]
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
    return threads.filter((thread) => thread.locationId === locationId)
  }, [threads, locationId])

  const salesReportFallbacks = useMemo(
    () => ({
      none: t('noSalesReport'),
      unavailable: t('salesReportUnavailable'),
    }),
    [t],
  )

  const threadSalesReportLabel = useCallback(
    (thread: AgentThreadRecord) =>
      resolveAnalyticsRunName(analyticsRuns, thread.analyticsRunId, salesReportFallbacks),
    [analyticsRuns, salesReportFallbacks],
  )

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

  const actionMenuProps = useMemo(
    () => ({
      desktopTriggerAriaLabel: t('actionsColumn'),
      mobileTriggerLabel: t('mobile.actionsTrigger'),
      sheetDescription: t('mobile.sheetDescription'),
    }),
    [t],
  )

  const titleEditorProps = useCallback(
    (thread: AgentThreadRecord, compactTouch: boolean) => ({
      threadId: thread.id,
      displayTitle: threadDisplayTitle(thread),
      editing: editingId === thread.id,
      draftTitle,
      editContainerRef,
      onDraftChange: setDraftTitle,
      onStartEdit: () => handleStartEdit(thread),
      onSaveEdit: handleSaveEdit,
      onDraftKeyDown: handleDraftKeyDown,
      editTitleAria: t('editThreadTitleAria'),
      saveTitleAria: t('saveThreadTitleAria'),
      titleLabel: t('threadTitleLabel'),
      compactTouch,
      hideEditButton: true,
    }),
    [
      draftTitle,
      editContainerRef,
      editingId,
      handleDraftKeyDown,
      handleSaveEdit,
      handleStartEdit,
      setDraftTitle,
      t,
      threadDisplayTitle,
    ],
  )

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex min-w-0 w-full flex-1 flex-col gap-4 sm:w-auto sm:flex-row sm:flex-wrap">
          <LocationSelect
            branches={branches}
            className="w-full max-w-none sm:max-w-xs"
            label={t('locationLabel')}
            placeholder={t('locationPlaceholder')}
          />
          <Field className="flex w-full max-w-none flex-col gap-2 sm:max-w-xs">
            <FieldLabel htmlFor="agent-analytics-run">{t('analyticsRunLabel')}</FieldLabel>
            <Select
              disabled={analyticsRuns.length === 0}
              onValueChange={(val) => setAnalyticsRunId(val ? Number(val) : null)}
              value={analyticsRunId !== null ? String(analyticsRunId) : undefined}
            >
              <SelectTrigger
                aria-label={t('analyticsRunLabel')}
                className="w-full"
                id="agent-analytics-run"
              >
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
        <Button
          className="w-full touch-manipulation sm:w-auto"
          disabled={locationId === null}
          onClick={handleNewChat}
          size="lg"
        >
          {t('newChat')}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t('threadsHeading')}</h2>
        {!hydrated ? (
          <div className="flex flex-col gap-3" aria-busy aria-label={t('threadsLoading')}>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton className="h-24 w-full rounded-lg lg:h-12" key={`thread-skeleton-${i}`} />
            ))}
          </div>
        ) : locationId === null ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{t('selectLocationTitle')}</EmptyTitle>
              <EmptyDescription>{t('selectLocation')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : visibleThreads.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{t('threadsEmptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('threadsEmpty')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col gap-3 lg:hidden">
              {visibleThreads.map((thread) => {
                const title = threadDisplayTitle(thread)
                const salesLabel = threadSalesReportLabel(thread)
                const isEditing = editingId === thread.id

                return (
                  <li
                    className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
                    key={thread.id}
                  >
                    {isEditing ? (
                      <AgentThreadTitleEditor {...titleEditorProps(thread, true)} />
                    ) : (
                      <Link
                        className="flex min-h-11 min-w-0 touch-manipulation flex-col gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={routes.agentThread(thread.id)}
                      >
                        <span className="truncate font-medium" title={title}>
                          {title}
                        </span>
                        <span className="truncate text-sm text-muted-foreground" title={salesLabel}>
                          {salesLabel}
                        </span>
                      </Link>
                    )}
                    <ResponsiveActionMenu
                      {...actionMenuProps}
                      items={buildThreadActionItems({
                        onRename: () => handleStartEdit(thread),
                        onRemove: () => setPendingRemoveId(thread.id),
                        renameLabel: t('editThreadTitleAria'),
                        removeLabel: t('removeThread'),
                      })}
                      sheetId={`agent-thread-actions-${thread.id}`}
                      sheetTitle={title}
                    />
                  </li>
                )
              })}
            </ul>

            <div className="-mx-4 hidden w-[calc(100%+2rem)] border-y lg:mx-0 lg:block lg:w-full lg:rounded-md lg:border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('threadColumn')}</TableHead>
                    <TableHead>{t('salesReportColumn')}</TableHead>
                    <TableHead className="w-28 text-right">{t('actionsColumn')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleThreads.map((thread) => (
                    <TableRow key={thread.id}>
                      <TableCell className="min-w-0 max-w-[min(100%,24rem)]">
                        <AgentThreadTitleEditor {...titleEditorProps(thread, false)} />
                      </TableCell>
                      <TableCell className="max-w-[min(100%,16rem)] truncate text-muted-foreground">
                        {threadSalesReportLabel(thread)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ResponsiveActionMenu
                          {...actionMenuProps}
                          items={buildThreadActionItems({
                            onRename: () => handleStartEdit(thread),
                            onRemove: () => setPendingRemoveId(thread.id),
                            renameLabel: t('editThreadTitleAria'),
                            removeLabel: t('removeThread'),
                          })}
                          sheetId={`agent-thread-actions-desktop-${thread.id}`}
                          sheetTitle={threadDisplayTitle(thread)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
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
