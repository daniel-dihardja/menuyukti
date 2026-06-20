'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle } from 'lucide-react'
import { useAnalytics } from '../../analytics/use-analytics'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  BLANK_PRESET_SELECTION_KEY,
  WORKFLOW_IMPORT_PRESETS,
  parsePresetIdFromSelectionKey,
} from '@/lib/workflows/presets'
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
  const [presetKey, setPresetKey] = useState<string>(BLANK_PRESET_SELECTION_KEY)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
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

  const handleWorkflowRenamed = useCallback(
    (_id: string, _name: string) => {
      router.refresh()
    },
    [router],
  )

  const handleWorkflowDeleted = useCallback(
    (_id: string) => {
      router.refresh()
    },
    [router],
  )

  const canCreateWorkflow = locationId !== null && !loadingRuns

  const handleCreateWorkflow = useCallback(async () => {
    if (locationId === null) {
      return
    }
    setCreating(true)
    setCreateError(null)
    setImportError(null)

    const body: {
      locationId: number
      analyticsRunId?: number
      templatePayload?: unknown
    } = { locationId }
    if (analyticsRunId !== null) {
      body.analyticsRunId = analyticsRunId
    }

    const presetId = parsePresetIdFromSelectionKey(presetKey)
    if (presetId !== null) {
      const preset = WORKFLOW_IMPORT_PRESETS.find((p) => p.id === presetId)
      if (preset?.payload != null) {
        body.templatePayload = preset.payload
      }
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
      if (presetId !== null) {
        setImportError(message)
      } else {
        setCreateError(message)
      }
    } finally {
      setCreating(false)
    }
  }, [analyticsRunId, locationId, presetKey, router, tNew])

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
        importError={importError}
        loadingRuns={loadingRuns}
        onAnalyticsRunIdChange={setAnalyticsRunId}
        onCreate={handleCreateWorkflow}
        onPresetKeyChange={setPresetKey}
        presetKey={presetKey}
        runsError={null}
      />

      {locationId === null ? null : loadingWorkflows ? (
        <div className="border rounded-md p-8 text-left text-muted-foreground">{t('loading')}</div>
      ) : hasWorkflows ? (
        <WorkflowsTable
          workflows={workflows}
          onWorkflowDeleted={handleWorkflowDeleted}
          onWorkflowRenamed={handleWorkflowRenamed}
        />
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-balance">{t('noWorkflows.title')}</CardTitle>
            <CardDescription className="text-pretty">
              {t('noWorkflows.description')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
