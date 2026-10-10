'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MapPinIcon } from 'lucide-react'

import { EnableLocationDialog } from '@/app/(protected)/services/pick-and-win/_components/enable-location-dialog'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { routes } from '@/lib/routes'

export type ConnectedLocation = {
  id: number
  name: string
}

export type EnableLocationOption = {
  id: number
  name: string
}

type Props = {
  locations: EnableLocationOption[]
  connectedLocations: ConnectedLocation[]
}

export function PredictionPdpClient({ locations, connectedLocations }: Props) {
  const t = useTranslations('services.prediction')
  const [enableOpen, setEnableOpen] = useState(false)

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <div className="bg-muted flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-lg">
          <div className="border-border bg-background flex w-52 flex-col gap-3 rounded-2xl border p-5 shadow-sm">
            <div className="bg-muted h-2.5 w-3/4 rounded" />
            <div className="flex flex-col gap-2">
              <div className="border-border flex items-center gap-2 rounded-md border px-2 py-2">
                <div className="bg-foreground/80 size-3 rounded-full" />
                <div className="bg-muted h-2 flex-1 rounded" />
              </div>
              <div className="border-border flex items-center gap-2 rounded-md border px-2 py-2">
                <div className="border-border size-3 rounded-full border" />
                <div className="bg-muted h-2 w-2/3 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground max-w-xl text-sm">{t('heroPitch')}</p>
            <p className="text-muted-foreground pt-1 text-sm">{t('pricingComingSoon')}</p>
          </div>
          <Button type="button" className="w-fit" onClick={() => setEnableOpen(true)}>
            {t('turnOnCta')}
          </Button>
        </div>
      </section>

      <section className="flex max-w-xl flex-col gap-3">
        <h2 className="text-base font-semibold">{t('includedTitle')}</h2>
        <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5 text-sm">
          <li>{t('included.enable')}</li>
          <li>{t('included.create')}</li>
          <li>{t('included.reward')}</li>
        </ul>
      </section>

      <section className="flex max-w-2xl flex-col gap-4">
        <h2 className="text-base font-semibold">{t('connectedTitle')}</h2>
        {connectedLocations.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinIcon />
              </EmptyMedia>
              <EmptyTitle>{t('connectedEmpty')}</EmptyTitle>
              <EmptyDescription>{t('connectedEmptyHint')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="border-border divide-border divide-y rounded-lg border">
            {connectedLocations.map((location) => (
              <li
                key={location.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{location.name}</span>
                  <Badge variant="secondary">{t('connectedStatusOn')}</Badge>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={routes.servicesPickAndWinLocation(location.id)}>
                    {t('manageCta')}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EnableLocationDialog open={enableOpen} onOpenChange={setEnableOpen} locations={locations} />
    </div>
  )
}
