'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { CreateWorkflowPanel } from './create-workflow-panel'
import { CampaignsTable, CampaignsTableSkeleton } from './campaigns-table'

type Branch = {
  id: number
  name: string
  nodeId: string | null
}

type CampaignNode = {
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
  initialCampaigns: CampaignNode[]
  initialAnalyticsRuns: AnalyticsRunItem[]
}

export function CampaignsClient({
  branches,
  initialLocationId,
  initialCampaigns,
  initialAnalyticsRuns,
}: Props) {
  const t = useTranslations('analytics.campaigns')
  const tNew = useTranslations('analytics.campaigns.newWorkflowDialog')
  const tChat = useTranslations('analytics.campaigns.chat')
  const router = useRouter()
  const { locationId, setLocationId } = useAnalytics()
  const [presetKey, setPresetKey] = useState<string>(BLANK_PRESET_SELECTION_KEY)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignNode[]>(initialCampaigns)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [analyticsRuns, setAnalyticsRuns] = useState<AnalyticsRunItem[]>(initialAnalyticsRuns)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [analyticsRunId, setAnalyticsRunId] = useState<number | null>(() => {
    const first = initialAnalyticsRuns[0]
    return first ? first.id : null
  })
  const hydratedRunsRef = useRef(false)
  const hydratedCampaignsRef = useRef(false)

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
    if (locationId === null) {
      setAnalyticsRuns([])
      setAnalyticsRunId(null)
      setRunsError(null)
      return
    }

    if (
      !hydratedRunsRef.current &&
      locationId === initialLocationId &&
      initialAnalyticsRuns.length > 0
    ) {
      hydratedRunsRef.current = true
      return
    }

    const controller = new AbortController()
    setLoadingRuns(true)
    setRunsError(null)

    void fetch(`/api/analytics/list?locationId=${locationId}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | AnalyticsRunItem[]
          | { error?: string }
          | null
        if (!res.ok) {
          const msg =
            body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
              ? body.error
              : t('listFailed')
          throw new Error(msg)
        }
        return Array.isArray(body) ? body : []
      })
      .then((list) => {
        setAnalyticsRuns(list)
        if (list.length > 0) {
          setAnalyticsRunId((prev) => {
            if (prev !== null && list.some((r) => r.id === prev)) {
              return prev
            }
            const first = list[0]
            return first ? first.id : null
          })
        } else {
          setAnalyticsRunId(null)
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        setAnalyticsRuns([])
        setAnalyticsRunId(null)
        setRunsError(err instanceof Error ? err.message : t('listFailed'))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingRuns(false)
        }
      })

    return () => controller.abort()
  }, [locationId, t, initialAnalyticsRuns.length, initialLocationId])

  useEffect(() => {
    if (locationId === null) {
      setCampaigns([])
      setListError(null)
      return
    }

    if (
      !hydratedCampaignsRef.current &&
      locationId === initialLocationId &&
      initialCampaigns.length > 0
    ) {
      hydratedCampaignsRef.current = true
      return
    }

    const controller = new AbortController()
    setLoadingCampaigns(true)
    setListError(null)

    void fetch(`/api/workflows?locationId=${locationId}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          nodes?: CampaignNode[]
          message?: string
        } | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('listFailed'))
        }
        return body?.nodes ?? []
      })
      .then((nodes) => {
        setCampaigns(nodes)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        setCampaigns([])
        setListError(err instanceof Error ? err.message : t('listFailed'))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingCampaigns(false)
        }
      })

    return () => controller.abort()
  }, [locationId, t, initialCampaigns.length, initialLocationId])

  const hasCampaigns = campaigns.length > 0

  const handleCampaignRenamed = useCallback((id: string, name: string) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }, [])

  const handleCampaignDeleted = useCallback((id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const branch = locationId !== null ? branches.find((b) => b.id === locationId) : undefined
  const canCreateWorkflow = locationId !== null && branch?.nodeId != null && !loadingRuns

  const handleCreateWorkflow = useCallback(async () => {
    if (locationId === null || branch?.nodeId == null) {
      return
    }
    setCreating(true)
    setCreateError(null)
    setImportError(null)

    const body: {
      locationId: number
      locationNodeId: string
      analyticsRunId?: number
    } = { locationId, locationNodeId: branch.nodeId }
    if (analyticsRunId !== null) {
      body.analyticsRunId = analyticsRunId
    }

    let workflowId: string
    try {
      const res = await fetch('/api/workflows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(errBody?.message ?? tNew('createFailed'))
      }
      const data = (await res.json()) as { id: string }
      workflowId = data.id
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : tNew('createFailed'))
      setCreating(false)
      return
    }

    const presetId = parsePresetIdFromSelectionKey(presetKey)
    if (presetId === null) {
      router.push(routes.workflows.detail(workflowId))
      setCreating(false)
      return
    }

    const preset = WORKFLOW_IMPORT_PRESETS.find((p) => p.id === presetId)
    const payload = preset?.payload
    if (payload == null) {
      router.push(routes.workflows.detail(workflowId))
      setCreating(false)
      return
    }

    try {
      const importRes = await fetch(`/api/workflows/${workflowId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      })
      const importBody = (await importRes.json().catch(() => null)) as {
        workflow?: { id: string }
        message?: string
      } | null
      if (!importRes.ok) {
        throw new Error(importBody?.message ?? tChat('importError'))
      }
      const newId = importBody?.workflow?.id
      if (!newId) {
        throw new Error(tChat('importError'))
      }
      router.push(routes.workflows.detail(newId))
    } catch (err) {
      setImportError(err instanceof Error ? err.message : tChat('importError'))
    } finally {
      setCreating(false)
    }
  }, [analyticsRunId, branch, locationId, presetKey, router, tChat, tNew])

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
        runsError={runsError}
      />

      {branch && !branch.nodeId ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t('errors.createTitle')}</AlertTitle>
          <AlertDescription>{t('missingLocationNode')}</AlertDescription>
        </Alert>
      ) : null}

      {locationId === null ? null : loadingCampaigns ? (
        <CampaignsTableSkeleton />
      ) : listError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t('errors.listTitle')}</AlertTitle>
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      ) : hasCampaigns ? (
        <CampaignsTable
          campaigns={campaigns}
          onCampaignDeleted={handleCampaignDeleted}
          onCampaignRenamed={handleCampaignRenamed}
        />
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-balance">{t('noCampaigns.title')}</CardTitle>
            <CardDescription className="text-pretty">
              {t('noCampaigns.description')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
