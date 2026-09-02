'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'
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

type Props = {
  item: InventoryCatalogItem
  workspaceId: number
  onClose: () => void
  onSuccess: () => void
}

export function CatalogDeleteConfirm({ item, workspaceId, onClose, onSuccess }: Props) {
  const t = useTranslations('inventar')
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    setPending(true)
    try {
      const params = new URLSearchParams({ workspaceId: String(workspaceId) })
      const res = await fetch(`/api/inventory-catalog/${item.id}?${params}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      onClose()
      toast.success(t('delete'))
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteCatalogWarning')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={() => void handleDelete()}>
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
