'use client'

import { useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { PlusIcon, SquarePenIcon, Trash2Icon } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'

import type { InstagramItemDto } from '@/lib/graphql/queries/instagram-items'

import { InstagramItemDefaultImage } from './instagram-item-default-image'

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

const OVERVIEW_GRID_CLASS =
  'mx-auto grid w-full max-w-[56rem] min-w-0 grid-cols-2 gap-3 lg:grid-cols-4'

function OverviewSkeletonGrid() {
  return (
    <ul aria-hidden className={OVERVIEW_GRID_CLASS}>
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="min-w-0">
          <div className="flex flex-col overflow-hidden border bg-background">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="flex flex-col gap-2 p-2.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
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
  const actionsDisabled = creating || loading || deletingId !== null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-2">
        <div className="flex w-full min-w-0 flex-col gap-1 lg:flex-1">
          <h2 className="font-semibold text-xl tracking-tight" id="workflow-preview-panel-title">
            {t('title')}
          </h2>
          <p className="text-muted-foreground text-sm">{t('panelDescription')}</p>
        </div>
        <Button
          className="w-full shrink-0 lg:w-auto"
          disabled={actionsDisabled}
          onClick={onCreate}
          size="sm"
          type="button"
        >
          {creating ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
          {t('newButton')}
        </Button>
      </div>

      {error ? (
        <Alert className="shrink-0" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-3">
          <span className="sr-only">{t('loading')}</span>
          <OverviewSkeletonGrid />
        </div>
      ) : items.length === 0 ? (
        <Empty className="min-h-0 flex-1 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SquarePenIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{t('emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('empty')}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled={creating} onClick={onCreate} size="sm" type="button">
              {creating ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              {t('newButton')}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul
          className={cn(OVERVIEW_GRID_CLASS, 'min-h-0 flex-1 content-start overflow-y-auto pt-3')}
        >
          {items.map((item) => {
            const kindKey = `kind.${item.kind}` as 'kind.story' | 'kind.post' | 'kind.reel'
            const statusKey = `status.${item.status}` as 'status.draft' | 'status.ready'
            const kindLabel = t.has(kindKey) ? t(kindKey) : item.kind
            const statusLabel = t.has(statusKey) ? t(statusKey) : item.status
            const title = item.title?.trim() ? item.title : t('untitled')
            const tileDeleting = deletingId === item.id
            return (
              <li key={item.id} className="min-w-0">
                <div className="relative flex h-full flex-col overflow-hidden border bg-background">
                  <button
                    className={cn(
                      'flex min-w-0 flex-1 flex-col text-left transition-colors',
                      'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      'disabled:pointer-events-none disabled:opacity-60',
                    )}
                    disabled={deletingId !== null}
                    onClick={() => onSelect(item.id)}
                    type="button"
                  >
                    <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                        <img alt={title} className="size-full object-cover" src={item.imageUrl} />
                      ) : (
                        <InstagramItemDefaultImage kind={item.kind} />
                      )}
                      {(item.pages?.length ?? 0) > 1 ? (
                        <Badge className="absolute top-1.5 left-1.5 shadow-sm" variant="outline">
                          {t('pages.countBadge', { count: item.pages.length })}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5">
                      <span className="line-clamp-2 font-medium text-sm leading-snug">{title}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">{kindLabel}</Badge>
                        <Badge variant="outline">{statusLabel}</Badge>
                      </span>
                      {item.schedule ? (
                        <span className="line-clamp-2 text-muted-foreground text-xs">
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
                    </span>
                  </button>
                  <Button
                    aria-label={t('deleteRowAria', { title })}
                    className="absolute right-1.5 bottom-1.5 size-7 bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
                    disabled={deletingId !== null}
                    onClick={() => setPendingDeleteId(item.id)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    {tileDeleting ? <Spinner /> : <Trash2Icon className="text-destructive" />}
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
              {isDeletingPending ? <Spinner data-icon="inline-start" /> : null}
              {t('deleteConfirmAction')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
