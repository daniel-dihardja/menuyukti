'use client'

import { startTransition, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { getAppCurrencyCode } from '@/lib/app-currency'
import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'
import { routes } from '@/lib/routes'

import { CatalogAddDialog } from './catalog-add-dialog'
import { CatalogDeleteConfirm } from './catalog-delete-confirm'
import { CatalogEditDialog } from './catalog-edit-dialog'
import { CatalogList } from './catalog-list'

type Props = {
  workspaceId: number
  catalogItems: InventoryCatalogItem[]
}

export function InventarCatalogClient({ workspaceId, catalogItems }: Props) {
  const t = useTranslations('inventar')
  const router = useRouter()
  const currencyCode = getAppCurrencyCode()

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<InventoryCatalogItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<InventoryCatalogItem | null>(null)

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={routes.inventar}
        className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← {t('backToStock')}
      </Link>

      <CatalogList
        catalogItems={catalogItems}
        currencyCode={currencyCode}
        onAdd={() => setAddOpen(true)}
        onEdit={setEditItem}
        onDelete={setDeleteItem}
      />

      {addOpen ? (
        <CatalogAddDialog
          workspaceId={workspaceId}
          onClose={() => setAddOpen(false)}
          onSuccess={refresh}
        />
      ) : null}

      {editItem != null ? (
        <CatalogEditDialog
          key={editItem.id}
          item={editItem}
          onClose={() => setEditItem(null)}
          onSuccess={refresh}
        />
      ) : null}

      {deleteItem != null ? (
        <CatalogDeleteConfirm
          key={deleteItem.id}
          item={deleteItem}
          workspaceId={workspaceId}
          onClose={() => setDeleteItem(null)}
          onSuccess={refresh}
        />
      ) : null}
    </div>
  )
}
