import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { ServicesSubscriptionsOverview } from '@/app/(protected)/services/_components/services-subscriptions-overview'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'
import { getCachedLocationsListData } from '@/lib/graphql/cached-queries'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  MY_SERVICE_SUBSCRIPTIONS_QUERY,
  SERVICE_KEY_DIGITAL_MENU,
  SERVICE_STATUS_ACTIVE,
  type MyServiceSubscriptionsData,
} from '@/lib/graphql/queries/service-subscriptions'
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
    <div className="bg-muted flex aspect-[16/9] items-center justify-center rounded-md">
      {children}
    </div>
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
  pricingComingSoon: string
  preview: ReactNode
  href?: string
  ctaLabel?: string
}

function CatalogCard({
  title,
  benefit,
  status,
  pricingComingSoon,
  preview,
  href,
  ctaLabel,
}: CatalogCardProps) {
  const card = (
    <Card
      className={cn(
        'h-full gap-4 py-0',
        href &&
          'hover:bg-muted/40 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none',
      )}
    >
      <CardContent className="pt-5">
        <ServicePreviewFrame>{preview}</ServicePreviewFrame>
      </CardContent>
      <CardHeader className="pt-0">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardAction>{status}</CardAction>
        <CardDescription className="text-pretty">{benefit}</CardDescription>
        <p className="text-muted-foreground text-sm">{pricingComingSoon}</p>
      </CardHeader>
      {href && ctaLabel ? (
        <CardFooter className="pb-5">
          <Button asChild variant="secondary" className="w-fit" tabIndex={-1}>
            <span>
              {ctaLabel}
              <ChevronRight data-icon="inline-end" />
            </span>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full rounded-xl focus-visible:outline-none">
        {card}
      </Link>
    )
  }

  return card
}

export default async function ServicesPage() {
  const t = await getTranslations('services')
  const tCatalog = await getTranslations('services.catalog')
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const [locationsData, subscriptionsData] = await Promise.all([
    getCachedLocationsListData(userId),
    graphqlQuery<MyServiceSubscriptionsData>(
      MY_SERVICE_SUBSCRIPTIONS_QUERY,
      { includeCanceled: false },
      userId,
      'MyServiceSubscriptions',
    ),
  ])

  const locationNameById = new Map(
    locationsData.locations.map((location) => [String(location.id), location.name]),
  )

  const activeSubscriptions = subscriptionsData.myServiceSubscriptions.filter(
    (row) => row.status === SERVICE_STATUS_ACTIVE,
  )

  const digitalMenuSubCount = activeSubscriptions.filter(
    (row) => row.serviceKey === SERVICE_KEY_DIGITAL_MENU,
  ).length

  const overviewRows = activeSubscriptions.flatMap((row) => {
    const locationId = Number(row.locationId)
    if (!Number.isInteger(locationId) || locationId < 1) return []
    return [
      {
        id: row.id,
        locationId,
        locationName: locationNameById.get(row.locationId) ?? row.locationId,
        serviceKey: row.serviceKey,
      },
    ]
  })

  const pricingComingSoon = tCatalog('pricingComingSoon')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title') }]}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('headline')}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">{t('subtitle')}</p>
        </div>

        <ServicesSubscriptionsOverview subscriptions={overviewRows} />

        <Separator />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CatalogCard
            title={tCatalog('digitalMenu.title')}
            benefit={tCatalog('digitalMenu.benefit')}
            status={
              <Badge variant="secondary">
                {digitalMenuSubCount > 0
                  ? tCatalog('digitalMenu.statusOn', { count: digitalMenuSubCount })
                  : tCatalog('digitalMenu.statusAvailable')}
              </Badge>
            }
            pricingComingSoon={pricingComingSoon}
            preview={<DigitalMenuPreview />}
            href={routes.servicesDigitalMenu}
            ctaLabel={tCatalog('viewCta')}
          />
          <CatalogCard
            title={tCatalog('stampCard.title')}
            benefit={tCatalog('stampCard.benefit')}
            status={<Badge variant="outline">{tCatalog('comingSoon')}</Badge>}
            pricingComingSoon={pricingComingSoon}
            preview={<StampCardPreview />}
          />
          <CatalogCard
            title={tCatalog('cashback.title')}
            benefit={tCatalog('cashback.benefit')}
            status={<Badge variant="outline">{tCatalog('comingSoon')}</Badge>}
            pricingComingSoon={pricingComingSoon}
            preview={<CashbackPreview />}
          />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
