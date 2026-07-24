'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Coins, Table2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { routes } from '@/lib/routes'
import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '../_components/responsive-action-menu'

interface SalesTableProps {
  uploads: Array<{ id: number; name: string }>
  onCogs: (analyticsId: number) => void
}

function buildActionItems(
  row: { id: number; name: string },
  t: ReturnType<typeof useTranslations<'analytics.sales.table'>>,
  onCogs: (analyticsId: number) => void,
): ResponsiveActionMenuItem[] {
  return [
    {
      id: 'matrix',
      label: t('matrix'),
      icon: Table2,
      href: routes.analytics.matrix(row.id),
    },
    {
      id: 'cogs',
      label: t('cogs'),
      icon: Coins,
      onSelect: () => onCogs(row.id),
    },
  ]
}

export function SalesTable({ uploads, onCogs }: SalesTableProps) {
  const t = useTranslations('analytics.sales.table')
  const tMobile = useTranslations('analytics.sales.table.mobile')

  const actionMenuProps = useMemo(
    () => ({
      desktopTriggerAriaLabel: t('action'),
      mobileTriggerLabel: tMobile('actionsTrigger'),
      sheetDescription: tMobile('sheetDescription'),
    }),
    [t, tMobile],
  )

  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {uploads.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-medium" title={row.name}>
                {row.name}
              </span>
            </div>
            <ResponsiveActionMenu
              {...actionMenuProps}
              items={buildActionItems(row, t, onCogs)}
              sheetId={`sales-report-actions-${row.id}`}
              sheetTitle={row.name}
            />
          </li>
        ))}
      </ul>

      <div className="hidden w-full border lg:block">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>{t('fileName')}</TableHead>
              <TableHead className="w-[80px] text-right">{t('action')}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {uploads.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="truncate" title={row.name}>
                    {row.name}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <ResponsiveActionMenu
                    {...actionMenuProps}
                    items={buildActionItems(row, t, onCogs)}
                    sheetId={`sales-report-actions-desktop-${row.id}`}
                    sheetTitle={row.name}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
