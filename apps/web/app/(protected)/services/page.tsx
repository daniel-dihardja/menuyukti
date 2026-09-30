import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import { LOCATION_MENU_QUERY, type LocationMenuData } from '@/lib/graphql/queries/location-menu'
import { routes } from '@/lib/routes'
import { cn } from '@workspace/ui/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('services')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description } }
}

function ServicePreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted flex aspect-[16/9] items-center justify-center rounded-md">{children}</div>
  )
}

function DigitalMenuPreview() {
  return (
    <div className="border-border bg-background flex h-40 w-24 flex-col overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-muted h-10 w-full" />
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="bg-muted h-2 w-3/4 rounded" />
        <div className="bg-muted h-2 w-1/2 rounded" />
        <div className="bg-muted mt-auto h-2 w-full rounded" />
      </div>
    </div>
  )
}

function StampCardPreview() {
  return (
    <div className="border-border bg-background flex w-48 flex-col gap-3 rounded-xl border p-4 shadow-sm">
      <div className="bg-muted h-2 w-2/3 rounded" />
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            className={cn(
              'aspect-square rounded-full border',
              index < 4 ? 'bg-foreground/80 border-foreground/80' : 'border-border bg-muted',
            )}
          />
        ))}
      </div>
    </div>
  )
}

function CashbackPreview() {
  return (
    <div className="border-border bg-background flex w-44 flex-col gap-3 rounded-xl border p-4 shadow-sm">
      <div className="bg-muted h-2 w-1/2 rounded" />
      <div className="flex items-end gap-1">
        <span className="text-2xl font-semibold tracking-tight">20%</span>
        <span className="text-muted-foreground pb-0.5 text-xs">back</span>
      </div>
      <div className="bg-muted h-2 w-full rounded" />
      <div className="bg-muted h-2 w-3/4 rounded" />
    </div>
  )
}

type CatalogCardProps = {
  title: string
  benefit: string
  status: ReactNode
  priceAmount: string
  pricingPeriod: string
  pricingNote: string
  preview: ReactNode
  href?: string
  ctaLabel?: string
  muted?: boolean
}

function CatalogCard({
  title,
  benefit,
  status,
  priceAmount,
  pricingPeriod,
  pricingNote,
  preview,
  href,
  ctaLabel,
  muted = false,
}: CatalogCardProps) {
  const body = (
    <>
      <ServicePreviewFrame>{preview}</ServicePreviewFrame>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {status}
        </div>
        <p className="text-muted-foreground text-sm">{benefit}</p>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold tracking-tight">
            {priceAmount}
            <span className="text-muted-foreground font-normal">{pricingPeriod}</span>
          </p>
          <p className="text-muted-foreground text-xs">{pricingNote}</p>
        </div>
        {href && ctaLabel ? (
          <Button asChild variant="secondary" className="mt-1 w-fit" tabIndex={-1}>
            <span>
              {ctaLabel}
              <ChevronRight className="size-4" />
            </span>
          </Button>
        ) : null}
      </div>
    </>
  )

  const className = cn(
    'border-border flex flex-col gap-4 rounded-lg border p-5',
    muted && 'opacity-90',
    href &&
      'hover:bg-muted/40 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none',
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    )
  }

  return <div className={className}>{body}</div>
}

export default async function ServicesPage() {
  const t = await getTranslations('services')
  const tCatalog = await getTranslations('services.catalog')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationsData = await getCachedLocationsListData(userId)
  const menuStatuses = await Promise.all(
    locationsData.locations.map(async (location) => {
      const locationId = Number(location.id)
      if (!Number.isInteger(locationId) || locationId < 1) {
        return false
      }
      const menuData = await graphqlQuery<LocationMenuData>(
        LOCATION_MENU_QUERY,
        { locationId },
        userId,
        'LocationMenu',
      )
      return menuData.locationMenu?.publicEnabled === true
    }),
  )
  const connectedCount = menuStatuses.filter(Boolean).length

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('headline')}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">{t('subtitle')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CatalogCard
            title={tCatalog('digitalMenu.title')}
            benefit={tCatalog('digitalMenu.benefit')}
            status={
              <Badge variant="secondary">
                {connectedCount > 0
                  ? tCatalog('digitalMenu.statusOn', { count: connectedCount })
                  : tCatalog('digitalMenu.statusAvailable')}
              </Badge>
            }
            priceAmount={tCatalog('digitalMenu.priceAmount')}
            pricingPeriod={tCatalog('pricingPeriod')}
            pricingNote={tCatalog('pricingNote')}
            preview={<DigitalMenuPreview />}
            href={routes.servicesDigitalMenu}
            ctaLabel={tCatalog('viewCta')}
          />
          <CatalogCard
            title={tCatalog('stampCard.title')}
            benefit={tCatalog('stampCard.benefit')}
            status={<Badge variant="outline">{tCatalog('comingSoon')}</Badge>}
            priceAmount={tCatalog('stampCard.priceAmount')}
            pricingPeriod={tCatalog('pricingPeriod')}
            pricingNote={tCatalog('pricingNote')}
            preview={<StampCardPreview />}
            muted
          />
          <CatalogCard
            title={tCatalog('cashback.title')}
            benefit={tCatalog('cashback.benefit')}
            status={<Badge variant="outline">{tCatalog('comingSoon')}</Badge>}
            priceAmount={tCatalog('cashback.priceAmount')}
            pricingPeriod={tCatalog('pricingPeriod')}
            pricingNote={tCatalog('pricingNote')}
            preview={<CashbackPreview />}
            muted
          />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
