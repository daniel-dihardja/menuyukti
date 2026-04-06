'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAnalytics } from '../../analytics/use-analytics'
import { LocationSelect } from '../../analytics/sales/location-select'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { CampaignsTable } from './campaigns-table'

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
      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, locationNodeId: branch.nodeId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? t('createFailed'))
      }
      const data = (await res.json()) as { id: string }
      router.push(routes.campaigns.detail(data.id))
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

    let cancelled = false
    setLoadingCampaigns(true)
    setListError(null)

    void fetch(`/api/campaigns?locationId=${locationId}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | { nodes?: CampaignNode[]; message?: string }
          | null
        if (!res.ok) {
          throw new Error(body?.message ?? t('listFailed'))
        }
        return body?.nodes ?? []
      })
      .then((nodes) => {
        if (!cancelled) {
          setCampaigns(nodes)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCampaigns([])
          setListError(err instanceof Error ? err.message : t('listFailed'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCampaigns(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [locationId, t])

  const hasCampaigns = campaigns.length > 0

  return (
    <div className="space-y-6">
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
            {creating ? t('creating') : t('create')}
          </Button>
        ) : null}
      </section>

      {createError ? (
        <p className="text-destructive text-sm" role="alert">
          {createError}
        </p>
      ) : null}

      {!locationId ? (
        <div className="rounded-md border p-8 text-left text-muted-foreground">{t('selectBranch')}</div>
      ) : loadingCampaigns ? (
        <div className="rounded-md border p-8 text-left">{t('loading')}</div>
      ) : listError ? (
        <p className="text-destructive text-sm" role="alert">
          {listError}
        </p>
      ) : hasCampaigns ? (
        <CampaignsTable campaigns={campaigns} />
      ) : (
        <div className="space-y-4 rounded-md border p-8 text-left">
          <h2 className="text-lg font-medium">{t('noCampaigns.title')}</h2>
          <p className="text-muted-foreground">{t('noCampaigns.description')}</p>
        </div>
      )}
    </div>
  )
}
