'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { LocationSelect } from '@/app/(protected)/analytics/sales/location-select'
import { useAnalytics } from '@/app/(protected)/analytics/use-analytics'
import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'
import type { InventoryStockRow } from '@/lib/graphql/queries/inventory-stock'
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
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import { formatPackLabel } from './format-pack'

function StockBadge({ onHand, packagesLabel }: { onHand: number; packagesLabel: string }) {
  const isLow = onHand <= 1
  return (
    <Badge variant={isLow ? 'destructive' : 'secondary'} className="tabular-nums">
      {onHand} {packagesLabel}
    </Badge>
  )
}

type Branch = { id: number; name: string }

type Props = {
  branches: Branch[]
  initialLocationId: number | null
  stockRows: InventoryStockRow[]
  catalogItems: InventoryCatalogItem[]
}

export function InventarStockClient({
  branches,
  initialLocationId,
  stockRows,
  catalogItems,
}: Props) {
  const t = useTranslations('inventar')
  const router = useRouter()
  const { locationId, setLocationId } = useAnalytics()

  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<InventoryStockRow | null>(null)
  const [removeRow, setRemoveRow] = useState<InventoryStockRow | null>(null)
  const [pending, setPending] = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('')
  const [addOnHand, setAddOnHand] = useState('0')
  const [editSubtract, setEditSubtract] = useState('0')

  useEffect(() => {
    if (initialLocationId !== null) {
      setLocationId(initialLocationId)
    }
  }, [initialLocationId, setLocationId])

  useEffect(() => {
    if (initialLocationId !== null) return
    if (locationId !== null) {
      if (branches.length > 0 && !branches.some((b) => b.id === locationId)) {
        setLocationId(null)
      }
      return
    }
    if (branches.length !== 1) return
    const [onlyBranch] = branches
    if (onlyBranch) setLocationId(onlyBranch.id)
  }, [initialLocationId, locationId, branches, setLocationId])

  useEffect(() => {
    if (locationId === null) return
    if (locationId === initialLocationId) return
    router.replace(routes.inventarWithLocation(locationId))
  }, [locationId, initialLocationId, router])

  const activeLocationId = locationId ?? initialLocationId

  const editSubtractAmount = Number(editSubtract)
  const editNewStock =
    editRow != null &&
    Number.isFinite(editSubtractAmount) &&
    editSubtractAmount >= 0 &&
    editSubtractAmount <= editRow.onHand
      ? editRow.onHand - editSubtractAmount
      : null

  const trackedCatalogIds = new Set(stockRows.map((row) => row.catalogItemId))
  const untrackedCatalog = catalogItems.filter((item) => !trackedCatalogIds.has(item.id))
  const canAddStock =
    activeLocationId != null && catalogItems.length > 0 && untrackedCatalog.length > 0

  function openAddDialog() {
    const [first] = untrackedCatalog
    setSelectedCatalogId(first ? String(first.id) : '')
    setAddOnHand('0')
    setAddOpen(true)
  }

  async function refresh() {
    router.refresh()
  }

  async function handleAddStock() {
    if (activeLocationId == null || !selectedCatalogId) {
      toast.error(t('validation.pantryItemRequired'))
      return
    }
    const onHand = Number(addOnHand)
    if (!Number.isFinite(onHand) || onHand < 0) {
      toast.error(t('validation.onHandMin'))
      return
    }
    setPending(true)
    try {
      const res = await fetch('/api/inventory-stock?mode=upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: activeLocationId,
          catalogItemId: Number(selectedCatalogId),
          onHand,
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setAddOpen(false)
      setSelectedCatalogId('')
      setAddOnHand('0')
      toast.success(t('addItem'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  async function handleEditStock() {
    if (editRow == null || activeLocationId == null) return
    const subtract = Number(editSubtract)
    if (!Number.isFinite(subtract) || subtract < 0) {
      toast.error(t('validation.subtractMin'))
      return
    }
    if (subtract > editRow.onHand) {
      toast.error(t('validation.subtractTooMuch'))
      return
    }
    const onHand = editRow.onHand - subtract
    setPending(true)
    try {
      const params = new URLSearchParams({
        locationId: String(activeLocationId),
        catalogItemId: String(editRow.catalogItemId),
      })
      const res = await fetch(`/api/inventory-stock/${editRow.id}?${params}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onHand }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setEditRow(null)
      toast.success(t('editStock'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  async function handleRemoveStock() {
    if (removeRow == null || activeLocationId == null) return
    setPending(true)
    try {
      const params = new URLSearchParams({ locationId: String(activeLocationId) })
      const res = await fetch(`/api/inventory-stock/${removeRow.id}?${params}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setRemoveRow(null)
      toast.success(t('removeFromLocation'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-pretty text-sm text-muted-foreground">{t('trustLine')}</p>

      {branches.length > 0 ? (
        <LocationSelect
          branches={branches}
          id="inventar-location-select"
          label={t('branchLabel')}
          placeholder={branches.length > 1 ? t('branchPlaceholder') : undefined}
          description={t('branchDescription')}
          className="w-full max-w-none sm:max-w-xs"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={!canAddStock} onClick={openAddDialog}>
          {t('addItem')}
        </Button>
      </div>

      {activeLocationId != null && catalogItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('catalogEmptyOnStock')}{' '}
          <Link
            href={routes.inventarCatalog}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('addPantryItem')}
          </Link>
        </p>
      ) : null}

      {activeLocationId != null &&
      catalogItems.length > 0 &&
      untrackedCatalog.length === 0 &&
      stockRows.length > 0 ? (
        <p className="text-sm text-muted-foreground">{t('noUntrackedItems')}</p>
      ) : null}

      {activeLocationId == null ? (
        <p className="text-sm text-muted-foreground">{t('branchPlaceholder')}</p>
      ) : stockRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium">{t('stockEmpty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('stockEmptyHint')}</p>
          {catalogItems.length === 0 ? (
            <Link
              href={routes.inventarCatalog}
              className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('addPantryItem')} →
            </Link>
          ) : null}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('pack')}</TableHead>
              <TableHead className="text-right">{t('currentStock')}</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.catalogItem.name}</TableCell>
                <TableCell>
                  {formatPackLabel(row.catalogItem.packageSize, row.catalogItem.packageUnit)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <StockBadge onHand={row.onHand} packagesLabel={t('packages')} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditRow(row)
                        setEditSubtract('0')
                      }}
                    >
                      {t('editStock')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveRow(row)}
                    >
                      {t('removeFromLocation')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Link
        href={routes.inventarCatalog}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t('managePantryItems')} →
      </Link>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addItem')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>{t('selectPantryItem')}</FieldLabel>
              <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPantryItemPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {untrackedCatalog.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} ({formatPackLabel(item.packageSize, item.packageUnit)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="inventar-add-on-hand">{t('currentStock')}</FieldLabel>
              <Input
                id="inventar-add-on-hand"
                inputMode="decimal"
                value={addOnHand}
                onChange={(e) => setAddOnHand(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <p className="text-sm text-muted-foreground">
            {t('addNewPantryItemPrompt')}{' '}
            <Link
              href={routes.inventarCatalog}
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setAddOpen(false)}
            >
              {t('addPantryItem')}
            </Link>
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void handleAddStock()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editStock')}</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <FieldGroup>
              <p className="text-sm text-muted-foreground">
                {editRow.catalogItem.name} (
                {formatPackLabel(editRow.catalogItem.packageSize, editRow.catalogItem.packageUnit)})
              </p>
              <Field>
                <FieldLabel>{t('currentStock')}</FieldLabel>
                <StockBadge onHand={editRow.onHand} packagesLabel={t('packages')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="inventar-edit-subtract">{t('subtract')}</FieldLabel>
                <Input
                  id="inventar-edit-subtract"
                  inputMode="decimal"
                  min={0}
                  value={editSubtract}
                  onChange={(e) => setEditSubtract(e.target.value)}
                />
              </Field>
              {editNewStock != null ? (
                <p className="text-sm text-muted-foreground">
                  {t('newStock')}:{' '}
                  <span className="font-medium tabular-nums text-foreground">
                    {editNewStock} {t('packages')}
                  </span>
                </p>
              ) : null}
            </FieldGroup>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
              {t('cancel')}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void handleEditStock()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeRow != null}
        onOpenChange={(open) => {
          if (!open) setRemoveRow(null)
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
    </div>
  )
}
