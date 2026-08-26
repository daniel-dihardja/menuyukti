'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import { formatPackLabel } from '../../_components/format-pack'

type Props = {
  workspaceId: number
  catalogItems: InventoryCatalogItem[]
}

type CatalogForm = {
  name: string
  packageSize: string
  packageUnit: string
}

const emptyForm: CatalogForm = {
  name: '',
  packageSize: '',
  packageUnit: 'kg',
}

export function InventarCatalogClient({ workspaceId, catalogItems }: Props) {
  const t = useTranslations('inventar')
  const router = useRouter()

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<InventoryCatalogItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<InventoryCatalogItem | null>(null)
  const [form, setForm] = useState<CatalogForm>(emptyForm)
  const [pending, setPending] = useState(false)

  function openEdit(item: InventoryCatalogItem) {
    setEditItem(item)
    setForm({
      name: item.name,
      packageSize: String(item.packageSize),
      packageUnit: item.packageUnit,
    })
  }

  async function refresh() {
    router.refresh()
  }

  function validateForm(): { packageSize: number } | null {
    const packageSize = Number(form.packageSize)
    if (!form.name.trim()) {
      toast.error(t('validation.nameRequired'))
      return null
    }
    if (!Number.isFinite(packageSize) || packageSize <= 0) {
      toast.error(t('validation.packageSizePositive'))
      return null
    }
    if (!form.packageUnit.trim()) {
      toast.error(t('validation.unitRequired'))
      return null
    }
    return { packageSize }
  }

  async function handleCreate() {
    const validated = validateForm()
    if (!validated) return
    setPending(true)
    try {
      const res = await fetch('/api/inventory-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: form.name.trim(),
          packageSize: validated.packageSize,
          packageUnit: form.packageUnit.trim(),
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setAddOpen(false)
      setForm(emptyForm)
      toast.success(t('addPantryItem'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  async function handleUpdate() {
    if (editItem == null) return
    const validated = validateForm()
    if (!validated) return
    setPending(true)
    try {
      const res = await fetch(`/api/inventory-catalog/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          packageSize: validated.packageSize,
          packageUnit: form.packageUnit.trim(),
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setEditItem(null)
      setForm(emptyForm)
      toast.success(t('editPantryItem'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (deleteItem == null) return
    setPending(true)
    try {
      const params = new URLSearchParams({ workspaceId: String(workspaceId) })
      const res = await fetch(`/api/inventory-catalog/${deleteItem.id}?${params}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(payload?.message ?? t('errorGeneric'))
      }
      setDeleteItem(null)
      toast.success(t('delete'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={routes.inventar}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline w-fit"
      >
        ← {t('backToStock')}
      </Link>

      <p className="text-pretty text-sm text-muted-foreground">{t('catalogDescription')}</p>

      <Button type="button" onClick={() => setAddOpen(true)}>
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
              <TableHead>{t('pack')}</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalogItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{formatPackLabel(item.packageSize, item.packageUnit)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(item)}
                    >
                      {t('editPantryItem')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteItem(item)}
                    >
                      {t('delete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addPantryItem')}</DialogTitle>
          </DialogHeader>
          <CatalogFormFields form={form} setForm={setForm} t={t} idPrefix="catalog-add" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void handleCreate()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editItem != null}
        onOpenChange={(open) => {
          if (!open) setEditItem(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editPantryItem')}</DialogTitle>
          </DialogHeader>
          <CatalogFormFields form={form} setForm={setForm} t={t} idPrefix="catalog-edit" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
              {t('cancel')}
            </Button>
            <Button type="button" disabled={pending} onClick={() => void handleUpdate()}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteItem != null}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null)
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
    </div>
  )
}

function CatalogFormFields({
  form,
  setForm,
  t,
  idPrefix,
}: {
  form: CatalogForm
  setForm: Dispatch<SetStateAction<CatalogForm>>
  t: ReturnType<typeof useTranslations<'inventar'>>
  idPrefix: string
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>{t('name')}</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-size`}>{t('packageSize')}</FieldLabel>
          <Input
            id={`${idPrefix}-size`}
            inputMode="decimal"
            value={form.packageSize}
            onChange={(e) => setForm((f) => ({ ...f, packageSize: e.target.value }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-unit`}>{t('packageUnit')}</FieldLabel>
          <Input
            id={`${idPrefix}-unit`}
            value={form.packageUnit}
            onChange={(e) => setForm((f) => ({ ...f, packageUnit: e.target.value }))}
          />
        </Field>
      </div>
    </FieldGroup>
  )
}
