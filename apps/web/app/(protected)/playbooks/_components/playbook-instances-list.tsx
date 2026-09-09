'use client'

import { Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '@/app/(protected)/analytics/_components/responsive-action-menu'
import { deletePlaybook, type Playbook } from '@/lib/playbooks/client-api'
import { routes } from '@/lib/routes'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

type Branch = {
  id: number
  name: string
}

type PlaybookInstancesListProps = {
  slug: string
  instances: Playbook[]
  branches: Branch[]
}

export function PlaybookInstancesList({ slug, instances, branches }: PlaybookInstancesListProps) {
  const t = useTranslations('playbooks')
  const router = useRouter()
  const [pendingDelete, setPendingDelete] = useState<Playbook | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const locationNameById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  )

  const actionMenuProps = useMemo(
    () => ({
      desktopTriggerAriaLabel: t('actionsAria'),
      mobileTriggerLabel: t('actionsMobile'),
      sheetDescription: t('actionsSheetDescription'),
    }),
    [t],
  )

  function actionItems(instance: Playbook): ResponsiveActionMenuItem[] {
    return [
      {
        id: 'open',
        label: t('open'),
        icon: Eye,
        href: routes.playbookInstance(slug, instance.id),
      },
      {
        id: 'remove',
        label: t('remove'),
        icon: Trash2,
        destructive: true,
        separatorBefore: true,
        onSelect: () => setPendingDelete(instance),
      },
    ]
  }

  async function confirmDelete() {
    if (pendingDelete === null || isDeleting) return
    const row = pendingDelete
    setIsDeleting(true)
    try {
      await deletePlaybook(row.id)
      toast.success(t('toast.deleted'))
      setPendingDelete(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="-mx-4 w-[calc(100%+2rem)] border-y lg:mx-0 lg:w-full lg:rounded-md lg:border">
        <Table aria-label={t('instancesAria')} className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.location')}</TableHead>
              <TableHead>{t('columns.period')}</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((instance) => {
              const locationName =
                locationNameById.get(instance.locationId) ?? t('detail.unknownLocation')
              return (
                <TableRow key={instance.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={routes.playbookInstance(slug, instance.id)}
                      className="hover:underline"
                    >
                      {instance.name}
                    </Link>
                  </TableCell>
                  <TableCell>{locationName}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {t('dateRange', { start: instance.startDate, end: instance.endDate })}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <ResponsiveActionMenu
                        items={actionItems(instance)}
                        sheetTitle={instance.name}
                        {...actionMenuProps}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: pendingDelete?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {isDeleting ? <Spinner data-icon="inline-start" /> : null}
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
