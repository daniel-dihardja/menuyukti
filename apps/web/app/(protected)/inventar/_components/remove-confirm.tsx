'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
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

import { inventarErrorMessage, type InventarApiErrorPayload } from './stock-utils'

type Props = {
  row: InventoryStockRow
  locationId: number
  onClose: () => void
  onSuccess: () => void
}

export function RemoveConfirm({ row, locationId, onClose, onSuccess }: Props) {
  const t = useTranslations('inventar')
  const [pending, setPending] = useState(false)

  async function handleRemoveStock() {
    setPending(true)
    try {
      const params = new URLSearchParams({
        locationId: String(locationId),
        catalogItemId: String(row.catalogItemId),
      })
      const res = await fetch(`/api/inventory-stock/${row.id}?${params}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as InventarApiErrorPayload | null
        throw new Error(inventarErrorMessage(payload, t))
      }
      onClose()
      toast.success(t('removeFromLocation'))
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
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
          <AlertDialogTitle>{t('removeFromLocation')}</AlertDialogTitle>
          <AlertDialogDescription>{t('removeFromLocationConfirm')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={() => void handleRemoveStock()}>
            {t('removeFromLocation')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
