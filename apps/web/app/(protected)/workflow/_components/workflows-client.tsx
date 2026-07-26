'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAnalytics } from '../../analytics/use-analytics'
import { routes } from '@/lib/routes'
import { apiFetch } from '@/lib/api/client-fetch'
import { CreateWorkflowPanel } from './create-workflow-panel'
import { WorkflowsTable } from './workflows-table'

type Branch = {
  id: number
  name: string
  nodeId: string | null
}

type WorkflowListItem = {
  id: string
  name: string
  nodeType: string
}

type AnalyticsRunItem = {
  id: number
  name: string
}

type Props = {
  branches: Branch[]
  initialLocationId: number | null
  initialWorkflows: WorkflowListItem[]
  initialAnalyticsRuns: AnalyticsRunItem[]
}

export function WorkflowsClient({
  branches,
  initialLocationId,
  initialWorkflows,
  initialAnalyticsRuns,
}: Props) {
  const t = useTranslations('analytics.workflows')
  const tNew = useTranslations('analytics.workflows.newWorkflowDialog')
  const router = useRouter()
  const { locationId, setLocationId } = useAnalytics()
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [analyticsRunId, setAnalyticsRunId] = useState<number | null>(() => {
    const first = initialAnalyticsRuns[0]
    return first ? first.id : null
  })

  useEffect(() => {
    if (locationId !== null) return
    if (initialLocationId !== null) {
      setLocationId(initialLocationId)
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
    router.replace(routes.workflows.listWithLocation(locationId))
  }, [locationId, initialLocationId, router])

  useEffect(() => {
    if (initialAnalyticsRuns.length === 0) {
      setAnalyticsRunId(null)
      return
    }
    setAnalyticsRunId((prev) => {
      if (prev !== null && initialAnalyticsRuns.some((r) => r.id === prev)) {
        return prev
      }
      const first = initialAnalyticsRuns[0]
      return first ? first.id : null
    })
  }, [initialAnalyticsRuns])

  const isNavigating = locationId !== null && locationId !== initialLocationId

  const workflows = initialWorkflows
  const analyticsRuns = initialAnalyticsRuns
  const hasWorkflows = workflows.length > 0
  const loadingWorkflows = isNavigating
  const loadingRuns = isNavigating

  const handleWorkflowRenamed = useCallback(() => {
    router.refresh()
  }, [router])

  const handleWorkflowDeleted = useCallback(() => {
    router.refresh()
  }, [router])

  const canCreateWorkflow = locationId !== null && !loadingRuns

  const handleCreateWorkflow = useCallback(async () => {
    if (locationId === null) {
      return
    }
    setCreating(true)
    setCreateError(null)

    const body: {
      locationId: number
      analyticsRunId?: number
    } = { locationId }
    if (analyticsRunId !== null) {
      body.analyticsRunId = analyticsRunId
    }

    try {
      const createResult = await apiFetch<{ id: string }>(
        '/api/workflows/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        tNew('createFailed'),
      )
      if (!createResult.ok) {
        throw new Error(createResult.error)
      }
      router.push(routes.workflows.detail(createResult.data.id))
    } catch (err) {
      const message = err instanceof Error ? err.message : tNew('createFailed')
      setCreateError(message)
    } finally {
      setCreating(false)
    }
  }, [analyticsRunId, locationId, router, tNew])

  return (
    <div className="flex flex-col gap-8">
      <CreateWorkflowPanel
        analyticsRunId={analyticsRunId}
        analyticsRuns={analyticsRuns}
        branches={branches}
        canCreate={canCreateWorkflow}
        createError={createError}
        creating={creating}
        hasSelectedLocation={locationId !== null}
        loadingRuns={loadingRuns}
        onAnalyticsRunIdChange={setAnalyticsRunId}
        onCreate={handleCreateWorkflow}
        runsError={null}
      />

      {locationId === null ? null : loadingWorkflows ? (
        <div className="rounded-md border border-dashed p-8 text-left text-muted-foreground">
          {t('loading')}
        </div>
      ) : hasWorkflows ? (
        <WorkflowsTable
          workflows={workflows}
          onWorkflowDeleted={handleWorkflowDeleted}
          onWorkflowRenamed={handleWorkflowRenamed}
        />
      ) : (
        <div className="flex flex-col gap-1 rounded-md border border-dashed px-4 py-6">
          <h2 className="text-balance font-medium">{t('noWorkflows.title')}</h2>
          <p className="text-pretty text-muted-foreground text-sm">
            {t('noWorkflows.description')}
          </p>
        </div>
      )}
    </div>
  )
}
