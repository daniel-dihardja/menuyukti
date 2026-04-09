'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { useAnalytics } from '../../analytics/use-analytics'
import { LocationSelect } from '../../analytics/sales/location-select'
import { routes } from '@/lib/routes'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Spinner } from '@workspace/ui/components/spinner'
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

type Props = {
  branches: Branch[]
}

export function CampaignsClient({ branches }: Props) {
  const t = useTranslations('analytics.campaigns')
  const router = useRouter()
  const { locationId, setLocationId } = useAnalytics()
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignNode[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const handleCreateCampaign = useCallback(async () => {
    if (locationId === null) return
    const branch = branches.find((b) => b.id === locationId)
    if (!branch?.nodeId) {
      setCreateError(t('missingLocationNode'))
      return
    }
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/workflows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, locationNodeId: branch.nodeId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? t('createFailed'))
      }
      const data = (await res.json()) as { id: string }
      router.push(routes.workflows.detail(data.id))
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('createFailed'))
    } finally {
      setCreating(false)
    }
  }, [branches, locationId, router, t])

  useEffect(() => {
    if (locationId !== null) return
    if (branches.length !== 1) return
    const [onlyBranch] = branches
    if (!onlyBranch) return
    setLocationId(onlyBranch.id)
  }, [locationId, branches, setLocationId])

  useEffect(() => {
    if (locationId === null) {
      setCampaigns([])
      setListError(null)
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
  }, [locationId, t])

  const hasCampaigns = campaigns.length > 0

  const handleCampaignRenamed = useCallback((id: string, name: string) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }, [])

  const handleCampaignDeleted = useCallback((id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-3">
        <LocationSelect
          branches={branches}
          id="campaigns-location-select"
          label={t('branchLabel')}
          placeholder={branches.length > 1 ? t('branchPlaceholder') : undefined}
          className="w-full max-w-none sm:max-w-xs"
        />
        {locationId !== null ? (
          <Button
            disabled={creating}
            onClick={() => void handleCreateCampaign()}
            size="default"
            type="button"
          >
            {creating ? (
              <>
                <Spinner />
                {t('creating')}
              </>
            ) : (
              t('create')
            )}
          </Button>
        ) : null}
      </section>

      {createError ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t('errors.createTitle')}</AlertTitle>
          <AlertDescription>{createError}</AlertDescription>
        </Alert>
      ) : null}

      {!locationId ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('selectBranchTitle')}</CardTitle>
            <CardDescription>{t('selectBranchDescription')}</CardDescription>
          </CardHeader>
        </Card>
      ) : loadingCampaigns ? (
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
        <Card>
          <CardHeader>
            <CardTitle>{t('noCampaigns.title')}</CardTitle>
            <CardDescription>{t('noCampaigns.description')}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
