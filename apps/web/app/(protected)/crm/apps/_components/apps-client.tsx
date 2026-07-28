'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createCrmApp, deleteCrmApp, type CrmApp } from '@/lib/crm/client-api'
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
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

type Props = {
  initialApps: CrmApp[]
}

export function AppsClient({ initialApps }: Props) {
  const t = useTranslations('platform.crm.apps')
  const router = useRouter()
  const [apps, setApps] = useState(initialApps)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [pendingDelete, setPendingDelete] = useState<CrmApp | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setApps(initialApps)
  }, [initialApps])

  const handleCreate = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    startTransition(async () => {
      try {
        const created = await createCrmApp({ title: trimmed })
        setApps((prev) => [...prev, created].toSorted((a, b) => a.title.localeCompare(b.title)))
        setTitle('')
        setShowForm(false)
        toast.success(t('toast.created'))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.createError'))
      }
    })
  }

  const confirmDelete = () => {
    if (pendingDelete === null || isDeleting) return
    const app = pendingDelete
    setIsDeleting(true)
    void (async () => {
      try {
        await deleteCrmApp(app.id)
        setApps((prev) => prev.filter((row) => row.id !== app.id))
        setPendingDelete(null)
        toast.success(t('toast.deleted'))
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('toast.deleteError'))
      } finally {
        setIsDeleting(false)
      }
    })()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showForm ? (
          <form
            className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <Field className="flex-1 space-y-2">
              <FieldLabel htmlFor="crm-app-title">{t('titleLabel')}</FieldLabel>
              <Input
                id="crm-app-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
                maxLength={256}
                disabled={isPending}
                autoFocus
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending || !title.trim()} className="gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {t('creating')}
                  </>
                ) : (
                  t('create')
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setShowForm(false)
                  setTitle('')
                }}
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-2 self-start"
            onClick={() => setShowForm(true)}
          >
            <Plus className="size-4" aria-hidden />
            {t('add')}
          </Button>
        )}
      </div>

      {apps.length === 0 ? (
        <div
          className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border px-6 py-12"
          role="status"
        >
          <p className="text-base font-medium tracking-tight">{t('emptyTitle')}</p>
          <p className="max-w-md text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {apps.map((app) => (
            <li
              key={app.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium tracking-tight">{app.title}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  <span className="sr-only">{t('appIdLabel')}: </span>
                  {app.appId}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-2 self-start text-destructive hover:text-destructive sm:self-center"
                disabled={isPending || isDeleting}
                onClick={() => setPendingDelete(app)}
                aria-label={t('delete')}
              >
                <Trash2 className="size-4" aria-hidden />
                {t('delete')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? t('deleteConfirmDescription', { title: pendingDelete.title }) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} type="button">
              {t('deleteConfirmCancel')}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || pendingDelete === null}
              onClick={confirmDelete}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('deleting')}
                </>
              ) : (
                t('deleteConfirmAction')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
