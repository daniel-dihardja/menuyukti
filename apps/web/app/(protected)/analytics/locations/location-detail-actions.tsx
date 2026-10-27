'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ClipboardList, MonitorSmartphone, UtensilsCrossed } from 'lucide-react'

import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '@/app/(protected)/analytics/_components/responsive-action-menu'
import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import { isActionMenuItemHiddenFromNonAdmin, isActionMenuKeyEnabled } from '@/lib/feature-flags'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'

type LocationDetailActionsProps = {
  locationId: string
}

function isLocationActionVisible(actionId: string, showAdminActions: boolean): boolean {
  if (!isActionMenuKeyEnabled(actionId)) return false
  if (!showAdminActions && isActionMenuItemHiddenFromNonAdmin(actionId)) return false
  return true
}

export function LocationDetailActions({ locationId }: LocationDetailActionsProps) {
  const t = useTranslations('analytics.branches')
  const { role, isLoaded } = useMenuyuktiRole()
  const showAdminActions = isLoaded && isMenuyuktiAdmin(role)

  const showReports = isLocationActionVisible('reports', showAdminActions)
  const showCogs = isLocationActionVisible('cogs', showAdminActions)

  const overflowItems: ResponsiveActionMenuItem[] = [
    {
      id: 'menu',
      label: t('manageMenu'),
      icon: UtensilsCrossed,
      href: routes.analytics.branchesMenu(locationId),
    },
    {
      id: 'digital-menu',
      label: t('manageDigitalMenu'),
      icon: MonitorSmartphone,
      href: routes.servicesDigitalMenuLocation(locationId),
    },
    {
      id: 'order-board',
      label: t('manageOrderBoard'),
      icon: ClipboardList,
      href: routes.servicesDigitalMenuOrders(locationId),
    },
  ].filter((item) => isLocationActionVisible(item.id, showAdminActions))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showReports ? (
        <Button asChild>
          <Link href={routes.analytics.branchesReports(locationId)}>{t('manageReports')}</Link>
        </Button>
      ) : null}
      {showCogs ? (
        <Button asChild variant="outline">
          <Link href={routes.analytics.branchesCogs(locationId)}>{t('manageCogs')}</Link>
        </Button>
      ) : null}
      {overflowItems.length > 0 ? (
        <ResponsiveActionMenu
          items={overflowItems}
          sheetTitle={t('moreActionsSheetTitle')}
          sheetDescription={t('moreActionsSheetDescription')}
          desktopTriggerAriaLabel={t('moreActionsAria')}
          mobileTriggerLabel={t('moreActions')}
          sheetId={`location-detail-actions-${locationId}`}
        />
      ) : null}
    </div>
  )
}
