'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { EnableLocationDialog } from '@/app/(protected)/services/digital-menu/_components/enable-location-dialog'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
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

export function DigitalMenuPdpClient({ locations, connectedLocations }: Props) {
  const t = useTranslations('services.digitalMenu')
  const [enableOpen, setEnableOpen] = useState(false)

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <div className="bg-muted flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-lg">
          <div className="border-border bg-background flex h-56 w-32 flex-col overflow-hidden rounded-2xl border shadow-sm">
            <div className="bg-muted h-14 w-full" />
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="bg-muted h-2.5 w-4/5 rounded" />
              <div className="bg-muted h-2.5 w-3/5 rounded" />
              <div className="bg-muted mt-2 h-16 w-full rounded" />
              <div className="bg-muted h-16 w-full rounded" />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground max-w-xl text-sm">{t('heroPitch')}</p>
            <div className="flex flex-col gap-0.5 pt-1">
              <p className="text-lg font-semibold tracking-tight">
                {t('pricing.amount')}
                <span className="text-muted-foreground text-sm font-normal">
                  {t('pricing.period')}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">{t('pricing.note')}</p>
            </div>
          </div>
          <Button type="button" className="w-fit" onClick={() => setEnableOpen(true)}>
            {t('turnOnCta')}
          </Button>
        </div>
      </section>

      <section className="flex max-w-xl flex-col gap-3">
        <h2 className="text-base font-semibold">{t('includedTitle')}</h2>
        <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
          <li>{t('included.link')}</li>
          <li>{t('included.catalog')}</li>
          <li>{t('included.qr')}</li>
        </ul>
      </section>

      <section className="flex max-w-2xl flex-col gap-4">
        <h2 className="text-base font-semibold">{t('addonsTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-border flex flex-col gap-2 rounded-lg border p-4">
            <h3 className="text-sm font-medium">{t('addons.header.title')}</h3>
            <p className="text-muted-foreground text-xs">{t('addons.header.description')}</p>
          </div>
          <div className="border-border flex flex-col gap-2 rounded-lg border p-4 opacity-80">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">{t('addons.favorites.title')}</h3>
              <Badge variant="outline">{t('addons.favorites.comingSoon')}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">{t('addons.favorites.description')}</p>
          </div>
        </div>
      </section>

      <section className="flex max-w-2xl flex-col gap-4">
        <h2 className="text-base font-semibold">{t('connectedTitle')}</h2>
        {connectedLocations.length === 0 ? (
          <div className="border-border flex flex-col gap-2 rounded-lg border border-dashed p-4">
            <p className="text-sm">{t('connectedEmpty')}</p>
            <p className="text-muted-foreground text-xs">{t('connectedEmptyHint')}</p>
          </div>
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
                  <Link href={routes.servicesDigitalMenuLocation(location.id)}>
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
