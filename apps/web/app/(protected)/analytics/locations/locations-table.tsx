'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { BarChart3, MapPin, Pencil, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '../_components/responsive-action-menu'
import { routes } from '@/lib/routes'
import {
  formatLocationSubtitle,
  getLocationSetupStatus,
  type LocationListItem,
} from '@/lib/locations/list-utils'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

export type LocationRow = LocationListItem & {
  analyticsRunCount: number
  latestAnalyticsId: number | null
}

type LocationsTableProps = {
  branches: LocationRow[]
  createHref: string
  indexLabel: string
  branchNameLabel: string
}

function statusBadgeVariant(
  status: ReturnType<typeof getLocationSetupStatus>,
): 'secondary' | 'outline' | 'default' {
  if (status === 'analytics_active') return 'default'
  if (status === 'ready_for_sales') return 'secondary'
  return 'outline'
}

function buildActionItems(
  row: LocationRow,
  t: ReturnType<typeof useTranslations<'analytics.branches.table'>>,
): ResponsiveActionMenuItem[] {
  const items: ResponsiveActionMenuItem[] = [
    {
      id: 'edit',
      label: t('view'),
      icon: Pencil,
      href: routes.analytics.branchesDetail(row.id),
    },
    {
      id: 'upload-sales',
      label: t('uploadSales'),
      icon: Upload,
      href: routes.analytics.salesWithLocation(row.id),
    },
  ]

  if (row.latestAnalyticsId !== null) {
    items.push({
      id: 'view-analytics',
      label: t('viewAnalytics'),
      icon: BarChart3,
      href: routes.analytics.matrix(row.latestAnalyticsId),
      separatorBefore: true,
    })
  }

  return items
}

function LocationStatusBadge({ row }: { row: LocationRow }) {
  const t = useTranslations('analytics.branches.table.status')
  const status = getLocationSetupStatus(row, row.analyticsRunCount)
  const label =
    status === 'analytics_active'
      ? t('analyticsActive')
      : status === 'ready_for_sales'
        ? t('readyForSales')
        : t('incomplete')

  return (
    <Badge variant={statusBadgeVariant(status)} className="w-fit shrink-0">
      {label}
    </Badge>
  )
}

function LocationsEmptyState({ createHref }: { createHref: string }) {
  const t = useTranslations('analytics.branches.empty')

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MapPin aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{t('title')}</EmptyTitle>
        <EmptyDescription>{t('description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href={createHref}>{t('createCta')}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">{t('salesHint')}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={routes.analytics.sales}>{t('salesCta')}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function LocationsTable({
  branches,
  createHref,
  indexLabel,
  branchNameLabel,
}: LocationsTableProps) {
  const t = useTranslations('analytics.branches.table')
  const tMobile = useTranslations('analytics.branches.table.mobile')

  const actionMenuProps = useMemo(
    () => ({
      desktopTriggerAriaLabel: t('action'),
      mobileTriggerLabel: tMobile('actionsTrigger'),
      sheetDescription: tMobile('sheetDescription'),
    }),
    [t, tMobile],
  )

  if (branches.length === 0) {
    return <LocationsEmptyState createHref={createHref} />
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {branches.map((branch) => {
          const subtitle = formatLocationSubtitle(branch)
          return (
            <li
              key={branch.id}
              className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
            >
              <Link
                href={routes.analytics.branchesDetail(branch.id)}
                className="flex min-h-11 min-w-0 touch-manipulation flex-col gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <span className="truncate font-medium" title={branch.name}>
                    {branch.name}
                  </span>
                  <LocationStatusBadge row={branch} />
                </div>
                {subtitle ? (
                  <span className="truncate text-sm text-muted-foreground" title={subtitle}>
                    {subtitle}
                  </span>
                ) : null}
              </Link>
              <ResponsiveActionMenu
                {...actionMenuProps}
                items={buildActionItems(branch, t)}
                sheetId={`location-actions-${branch.id}`}
                sheetTitle={branch.name}
              />
            </li>
          )
        })}
      </ul>

      <div className="-mx-4 hidden w-[calc(100%+2rem)] border-x-0 border-y sm:mx-0 sm:w-full sm:rounded-md sm:border md:block">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">{indexLabel}</TableHead>
              <TableHead>{branchNameLabel}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('city')}</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[80px] text-right">{t('action')}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {branches.map((branch, index) => {
              const subtitle = formatLocationSubtitle(branch)
              return (
                <TableRow key={branch.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={routes.analytics.branchesDetail(branch.id)}
                        className="truncate font-medium underline-offset-4 hover:underline"
                        title={branch.name}
                      >
                        {branch.name}
                      </Link>
                      {subtitle ? (
                        <span className="truncate text-xs text-muted-foreground lg:hidden">
                          {subtitle}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span
                      className="truncate text-muted-foreground"
                      title={branch.city ?? undefined}
                    >
                      {branch.city?.trim() || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <LocationStatusBadge row={branch} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ResponsiveActionMenu
                      {...actionMenuProps}
                      items={buildActionItems(branch, t)}
                      sheetId={`location-actions-desktop-${branch.id}`}
                      sheetTitle={branch.name}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
