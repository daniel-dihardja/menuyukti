'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BarChart3, Calculator, MonitorSmartphone } from 'lucide-react'

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

export function LocationDetailActions({ locationId }: LocationDetailActionsProps) {
  const t = useTranslations('analytics.branches')
  const { role, isLoaded } = useMenuyuktiRole()
  const showAdminActions = isLoaded && isMenuyuktiAdmin(role)

  const overflowItems: ResponsiveActionMenuItem[] = [
    {
      id: 'reports',
      label: t('manageReports'),
      icon: BarChart3,
      href: routes.analytics.branchesReports(locationId),
    },
    {
      id: 'cogs',
      label: t('manageCogs'),
      icon: Calculator,
      href: routes.analytics.branchesCogs(locationId),
    },
    {
      id: 'pos',
      label: t('managePos'),
      icon: MonitorSmartphone,
      href: routes.analytics.branchesPos(locationId),
    },
  ].filter((item) => {
    if (!isActionMenuKeyEnabled(item.id)) return false
    if (!showAdminActions && isActionMenuItemHiddenFromNonAdmin(item.id)) return false
    return true
  })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild>
        <Link href={routes.analytics.branchesMenu(locationId)}>{t('manageMenu')}</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={routes.servicesDigitalMenuLocation(locationId)}>{t('manageDigitalMenu')}</Link>
      </Button>
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
