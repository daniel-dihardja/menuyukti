'use client'

import { useLocale, useTranslations } from 'next-intl'

import { formatCurrencyWithCode } from '@/lib/currency'
import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'
import { Button } from '@workspace/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import { formatPackLabel } from '../../_components/format-pack'

type Props = {
  catalogItems: InventoryCatalogItem[]
  currencyCode: string
  onAdd: () => void
  onEdit: (item: InventoryCatalogItem) => void
  onDelete: (item: InventoryCatalogItem) => void
}

export function CatalogList({ catalogItems, currencyCode, onAdd, onEdit, onDelete }: Props) {
  const t = useTranslations('inventar')
  const locale = useLocale()

  function formatPrice(price: number | null): string {
    if (price == null) return t('priceEmpty')
    return formatCurrencyWithCode(price, currencyCode, locale)
  }

  return (
    <>
      <p className="text-pretty text-sm text-muted-foreground">{t('catalogDescription')}</p>

      <Button type="button" onClick={onAdd}>
        {t('addPantryItem')}
      </Button>

      {catalogItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium">{t('catalogEmpty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('catalogEmptyHint')}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('storageZone')}</TableHead>
              <TableHead>{t('pack')}</TableHead>
              <TableHead className="text-right">{t('price')}</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalogItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{t(`storageZones.${item.storageZone}`)}</TableCell>
                <TableCell>{formatPackLabel(item.packageSize, item.packageUnit)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(item.price)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item)}>
                      {t('editPantryItem')}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(item)}>
                      {t('delete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
