'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAnalytics } from '../../analytics/use-analytics'
import { LocationSelect } from '../../analytics/sales/location-select'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

type Branch = {
  id: number
  name: string
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

  const handleCreateCampaign = useCallback(async () => {
    if (locationId === null) return
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
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
  }, [locationId, router, t])

  useEffect(() => {
    if (locationId !== null) return
    if (branches.length !== 1) return
    const [onlyBranch] = branches
    if (!onlyBranch) return
    setLocationId(onlyBranch.id)
  }, [locationId, branches, setLocationId])

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
