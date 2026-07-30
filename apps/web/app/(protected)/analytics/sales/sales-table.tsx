'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { BarChart3, Coins, Flame, Link2, List, Radio, Sparkles, Table2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { isActionMenuItemHiddenFromNonAdmin } from '@/lib/admin-only-features'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { routes } from '@/lib/routes'
import { useMenuyuktiRole } from '@/hooks/use-menuyukti-role'
import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '../_components/responsive-action-menu'

interface SalesTableProps {
  uploads: Array<{ id: number; name: string }>
  onDelete: (analyticsId: number) => Promise<{ ok: true } | { ok: false }>
  onCogs: (analyticsId: number) => void
  deleting?: boolean
}

function buildActionItems(
  row: { id: number; name: string },
  t: ReturnType<typeof useTranslations<'analytics.sales.table'>>,
  onCogs: (analyticsId: number) => void,
  onRequestDelete: (row: { id: number; name: string }) => void,
  showAdminActions: boolean,
): ResponsiveActionMenuItem[] {
  const items: ResponsiveActionMenuItem[] = [
    {
      id: 'menu-items',
      label: t('menuItems'),
      icon: List,
      href: routes.analytics.menuItems(row.id),
    },
    {
      id: 'cogs',
      label: t('cogs'),
      icon: Coins,
      onSelect: () => onCogs(row.id),
    },
    {
      id: 'matrix',
      label: t('matrix'),
      icon: Table2,
      href: routes.analytics.matrix(row.id),
    },
    {
      id: 'heatmap',
      label: t('heatmap'),
      icon: Flame,
      href: routes.analytics.heatmap(row.id),
    },
    {
      id: 'menu-combos',
      label: t('menuCombos'),
      icon: Link2,
      href: routes.analytics.menuCombos(row.id),
    },
    {
      id: 'order-metrics',
      label: t('orderMetrics'),
      icon: BarChart3,
      href: routes.analytics.orderMetrics(row.id),
    },
    {
      id: 'campaign-signals',
      label: t('campaignSignals'),
      icon: Radio,
      href: routes.analytics.campaignSignals(row.id),
    },
    {
      id: 'ask-ai',
      label: t('askAi'),
      icon: Sparkles,
      href: routes.agent,
      separatorBefore: true,
    },
    {
      id: 'delete',
      label: t('delete'),
      icon: Trash2,
      destructive: true,
      separatorBefore: true,
      onSelect: () => onRequestDelete(row),
    },
  ]

  if (showAdminActions) return items
  return items.filter((item) => !isActionMenuItemHiddenFromNonAdmin(item.id))
}

export function SalesTable({ uploads, onDelete, onCogs, deleting = false }: SalesTableProps) {
  const t = useTranslations('analytics.sales.table')
  const tDelete = useTranslations('analytics.sales.delete')
  const tMobile = useTranslations('analytics.sales.table.mobile')
  const { role, isLoaded } = useMenuyuktiRole()
  const showAdminActions = isLoaded && isMenuyuktiAdmin(role)

  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const onRequestDelete = useCallback((row: { id: number; name: string }) => {
    setDeleteError(null)
    setPendingDelete(row)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    const result = await onDelete(pendingDelete.id)
    if (result.ok) {
      setPendingDelete(null)
      return
    }
    setDeleteError(tDelete('error'))
  }, [onDelete, pendingDelete, tDelete])

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
              items={buildActionItems(row, t, onCogs, onRequestDelete, showAdminActions)}
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
                    items={buildActionItems(row, t, onCogs, onRequestDelete, showAdminActions)}
                    sheetId={`sales-report-actions-desktop-${row.id}`}
                    sheetTitle={row.name}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (open) return
          if (deleting) return
          setPendingDelete(null)
          setDeleteError(null)
        }}
        open={pendingDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDelete('title')}</AlertDialogTitle>
            <AlertDialogDescription>{tDelete('description')}</AlertDialogDescription>
            {deleteError ? (
              <p className="text-destructive text-sm" role="alert">
                {deleteError}
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} type="button">
              {tDelete('cancel')}
            </AlertDialogCancel>
            <Button
              className={deleting ? 'inline-flex items-center gap-2' : undefined}
              disabled={deleting}
              onClick={() => void confirmDelete()}
              type="button"
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Spinner />
                  {tDelete('confirm')}
                </>
              ) : (
                tDelete('confirm')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
