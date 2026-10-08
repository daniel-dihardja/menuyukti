import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Button } from '@workspace/ui/components/button'
import { isReservedPublicSlug } from '@/lib/public-location/reserved-slugs'
import { loadPublicLocation } from '@/lib/public-location/load-public-location'
import { routes } from '@/lib/routes'

type PageProps = {
  params: Promise<{ slug: string }>
}

function serviceHref(slug: string, hrefSegment: string): string {
  if (hrefSegment === 'menu') return routes.public.locationMenu(slug)
  if (hrefSegment === 'prediction') return routes.public.locationPrediction(slug)
  return routes.public.locationHome(slug)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('public.locationHome')
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) {
    return { title: t('notFoundTitle') }
  }
  try {
    const location = await loadPublicLocation(decoded)
    if (!location) return { title: t('notFoundTitle') }
    const title = location.name
    const description = t('metaDescription', { name: location.name })
    return { title, description, openGraph: { title, description } }
  } catch {
    return { title: t('notFoundTitle') }
  }
}

export default async function PublicLocationHomePage({ params }: PageProps) {
  const t = await getTranslations('public.locationHome')
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  if (isReservedPublicSlug(decoded)) notFound()

  const location = await loadPublicLocation(decoded)
  if (!location) notFound()

  const available = location.services.filter((s) => s.available)
  const serviceLabel = (key: string): string => {
    if (key === 'digital_menu') return t('services.digital_menu')
    if (key === 'prediction') return t('services.prediction')
    return key
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-2">
        <h1 className="text-pretty text-3xl font-semibold tracking-tight sm:text-4xl">
          {available.length === 0 ? t('greetingLead', { name: location.name }) : location.name}
        </h1>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground">
          {available.length > 0 ? t('lead') : t('greetingEmpty')}
        </p>
      </div>

      {available.length === 0 ? null : (
        <div className="flex flex-col gap-3">
          {available.map((service) => (
            <Button
              key={service.key}
              asChild
              className="min-h-12 w-full justify-center text-base"
              size="lg"
            >
              <Link href={serviceHref(location.publicSlug, service.hrefSegment)}>
                {serviceLabel(service.key)}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </main>
  )
}
