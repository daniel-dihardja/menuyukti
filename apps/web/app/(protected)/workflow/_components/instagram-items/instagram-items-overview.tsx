'use client'

import { useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'

import type { InstagramItemDto } from '@/lib/graphql/queries/instagram-items'

type InstagramItemsOverviewProps = {
  items: InstagramItemDto[]
  loading: boolean
  error: string | null
  creating: boolean
  deletingId: string | null
  onCreate: () => void
  onSelect: (itemId: string) => void
  onDelete: (itemId: string) => Promise<void>
}

export function InstagramItemsOverview({
  items,
  loading,
  error,
  creating,
  deletingId,
  onCreate,
  onSelect,
  onDelete,
}: InstagramItemsOverviewProps) {
  const t = useTranslations('analytics.workflows.instagramItems')
  const format = useFormatter()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const pendingItem =
    pendingDeleteId !== null ? items.find((item) => item.id === pendingDeleteId) : undefined
  const isDeletingPending = pendingDeleteId !== null && deletingId === pendingDeleteId

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h2 className="font-semibold text-xl tracking-tight" id="workflow-preview-panel-title">
            {t('title')}
          </h2>
          <p className="text-muted-foreground text-sm">{t('panelDescription')}</p>
        </div>
        <Button
          className={creating ? 'inline-flex shrink-0 items-center gap-2' : 'shrink-0'}
          disabled={creating || loading || deletingId !== null}
          onClick={onCreate}
          size="sm"
          type="button"
        >
          {creating ? <Spinner className="size-3.5" /> : <PlusIcon className="size-3.5" />}
          {t('newButton')}
        </Button>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Spinner className="size-4" />
          {t('loading')}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {items.map((item) => {
            const kindKey = `kind.${item.kind}` as 'kind.story' | 'kind.post' | 'kind.reel'
            const statusKey = `status.${item.status}` as 'status.draft' | 'status.ready'
            const kindLabel = t.has(kindKey) ? t(kindKey) : item.kind
            const statusLabel = t.has(statusKey) ? t(statusKey) : item.status
            const rowDeleting = deletingId === item.id
            return (
              <li key={item.id}>
                <div className="flex items-stretch gap-1 rounded-md border bg-background">
                  <button
                    className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={deletingId !== null}
                    onClick={() => onSelect(item.id)}
                    type="button"
                  >
                    <span className="truncate font-medium text-sm">
                      {item.title?.trim() ? item.title : t('untitled')}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{kindLabel}</Badge>
                      <Badge variant="outline">{statusLabel}</Badge>
                    </span>
                    {item.schedule ? (
                      <span className="text-muted-foreground text-xs">
                        {t('fields.schedule')}:{' '}
                        {format.dateTime(new Date(item.schedule), {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </span>
                    ) : null}
                  </button>
                  <Button
                    aria-label={t('deleteRowAria', {
                      title: item.title?.trim() ? item.title : t('untitled'),
                    })}
                    className="m-1 shrink-0 self-center"
                    disabled={deletingId !== null}
                    onClick={() => setPendingDeleteId(item.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    {rowDeleting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Trash2Icon className="size-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingPending) {
            setPendingDeleteId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingItem
                ? t('deleteConfirmDescriptionNamed', {
                    title: pendingItem.title?.trim() ? pendingItem.title : t('untitled'),
                  })
                : t('deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPending} type="button">
              {t('deleteConfirmCancel')}
            </AlertDialogCancel>
            <Button
              className={isDeletingPending ? 'inline-flex items-center gap-2' : undefined}
              disabled={isDeletingPending || pendingDeleteId === null}
              onClick={() => {
                if (pendingDeleteId === null) return
                void (async () => {
                  await onDelete(pendingDeleteId)
                  setPendingDeleteId(null)
                })()
              }}
              type="button"
              variant="destructive"
            >
              {isDeletingPending ? <Spinner className="size-3.5" /> : null}
              {t('deleteConfirmAction')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
