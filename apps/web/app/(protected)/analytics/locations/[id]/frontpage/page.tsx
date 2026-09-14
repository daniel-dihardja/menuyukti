import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, LOCATION_DETAIL_SECTION_CLASS } from '@/lib/app-layout'
import {
  getCachedLocation,
  getCachedLocationAnalyticsSummaries,
  getCachedMenuCombos,
  getCachedMenuEngineeringMatrix,
} from '@/lib/graphql/cached-queries'
import { routes } from '@/lib/routes'

import {
  LocationFrontpageForm,
  type FrontpageComboPreview,
  type FrontpageFavoritePreview,
} from './location-frontpage-form'

const FAVORITES_LIMIT = 5
const COMBOS_LIMIT = 3
const STRONG_LIFT_THRESHOLD = 1.5

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('analytics.locationFrontpage')
  const description = t('description')
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return { title: t('heading'), description, openGraph: { title: t('heading'), description } }
  }
  const data = await getCachedLocation(userId, id)
  const title = data.location ? `${data.location.name} · ${t('heading')}` : t('heading')
  return { title, description, openGraph: { title, description } }
}

function pickFavorites(
  items: Array<{ menu: string; quantity: number; category: string }> | undefined,
): FrontpageFavoritePreview[] {
  if (!items?.length) return []
  return items
    .filter((item) => item.category === 'star')
    .toSorted((a, b) => b.quantity - a.quantity || a.menu.localeCompare(b.menu))
    .slice(0, FAVORITES_LIMIT)
    .map((item) => ({ menu: item.menu }))
}

function pickCombos(
  pairs:
    | Array<{ menuA: string; menuB: string; lift: number; coOrderCount: number }>
    | undefined,
): FrontpageComboPreview[] {
  if (!pairs?.length) return []
  return pairs
    .filter((pair) => pair.lift >= STRONG_LIFT_THRESHOLD)
    .toSorted(
      (a, b) =>
        b.lift - a.lift || b.coOrderCount - a.coOrderCount || a.menuA.localeCompare(b.menuA),
    )
    .slice(0, COMBOS_LIMIT)
    .map((pair) => ({ menuA: pair.menuA, menuB: pair.menuB }))
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error('Invariant: expected authenticated session under (protected) layout')
  }

  const locationId = Number(id)
  if (!Number.isInteger(locationId) || locationId < 1) notFound()

  const [locationData, summaries] = await Promise.all([
    getCachedLocation(userId, id),
    getCachedLocationAnalyticsSummaries(userId, [locationId]),
  ])

  const location = locationData.location
  if (!location) notFound()

  const summary = summaries.locationAnalyticsSummaries.find((row) => row.locationId === locationId)
  const latestRun = summary?.latestRun ?? null
  const hasAnalyticsRun = latestRun != null

  let favorites: FrontpageFavoritePreview[] = []
  let combos: FrontpageComboPreview[] = []

  if (latestRun) {
    const [matrixData, combosData] = await Promise.all([
      getCachedMenuEngineeringMatrix(userId, latestRun.id, String(locationId)),
      getCachedMenuCombos(userId, latestRun.id, String(locationId)),
    ])
    favorites = pickFavorites(matrixData.menuEngineeringMatrix?.items)
    combos = pickCombos(combosData.menuCombos?.pairs)
  }

  const frontpage = location.frontpage
  const t = await getTranslations('analytics.locationFrontpage')
  const tBranches = await getTranslations('analytics.branches')

  return (
    <AnalyticsPageShell
      title={t('heading')}
      breadcrumbs={[
        { label: tBranches('title'), href: routes.analytics.branches },
        { label: location.name, href: routes.analytics.branchesDetail(location.id) },
        { label: t('heading') },
      ]}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
    >
      <section className={LOCATION_DETAIL_SECTION_CLASS}>
        <LocationFrontpageForm
          locationId={locationId}
          locationName={location.name}
          initialTagline={frontpage?.tagline ?? ''}
          initialShowGuestFavorites={frontpage?.showGuestFavorites ?? true}
          initialShowPopularCombos={frontpage?.showPopularCombos ?? true}
          latestRunName={latestRun?.name ?? null}
          favorites={favorites}
          combos={combos}
          hasAnalyticsRun={hasAnalyticsRun}
        />
      </section>
    </AnalyticsPageShell>
  )
}
