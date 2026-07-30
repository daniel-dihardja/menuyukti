'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

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

  const handleRemove = useCallback((id: string) => {
    removeAgentThread(id)
    setThreads(listAgentThreads())
    void fetch(`/api/chat/history?agentThreadId=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {
      /* best-effort */
    })
  }, [])

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
                    <TableCell>
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={routes.agentThread(thread.id)}
                      >
                        {thread.title?.trim() || t('untitledThread', { id: thread.id.slice(0, 8) })}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleRemove(thread.id)}
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
    </div>
  )
}
