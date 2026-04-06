'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAnalytics } from '../../analytics/use-analytics'
import { LocationSelect } from '../../analytics/sales/location-select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

type Branch = {
  id: number
  name: string
}

type Props = {
  branches: Branch[]
}

export function CampaignsClient({ branches }: Props) {
  const t = useTranslations('analytics.campaigns')
  const { locationId, setLocationId } = useAnalytics()

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
      </section>

      {!locationId ? (
        <div className="rounded-md border p-8 text-left text-muted-foreground">{t('selectBranch')}</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('dataRedesign.title')}</CardTitle>
            <CardDescription>{t('dataRedesign.description')}</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{t('dataRedesign.note')}</CardContent>
        </Card>
      )}
    </div>
  )
}
