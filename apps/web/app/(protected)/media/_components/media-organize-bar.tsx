'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { useMediaActions, useMediaState } from './media-context'

export function MediaOrganizeBar() {
  const t = useTranslations('media.collections')
  const { selected, collections, currentCollection, addCollectionId, collectionsBusy } =
    useMediaState()
  const {
    setAddCollectionId,
    clearSelection,
    addSelectedToCollection,
    removeSelectedFromCurrent,
    setOrganizeBarHeight,
  } = useMediaActions()
  const rootRef = useRef<HTMLDivElement>(null)

  const currentCollectionId = currentCollection?.id ?? null
  const currentCollectionName = currentCollection?.name ?? null
  const canRemove = currentCollectionId != null
  const canAdd = collections.length > 0 && Boolean(addCollectionId)

  useEffect(() => {
    const el = rootRef.current
    if (!el || !selected) return

    const report = () => {
      setOrganizeBarHeight(el.getBoundingClientRect().height)
    }

    report()
    const observer = new ResizeObserver(report)
    observer.observe(el)
    return () => {
      observer.disconnect()
      setOrganizeBarHeight(0)
    }
  }, [selected, setOrganizeBarHeight])

  if (!selected) return null

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={t('organizeRegion')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 p-3 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur supports-[backdrop-filter]:bg-background/85 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user upload thumbnail */}
            <img src={selected.url} alt="" className="size-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{t('selectedTitle')}</p>
            <p className="truncate text-xs text-muted-foreground">
              {selected.displayName?.trim() || t('selectedPhotoFallback')}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-11 shrink-0 touch-manipulation sm:size-9"
            aria-label={t('clearSelection')}
            disabled={collectionsBusy}
            onClick={clearSelection}
          >
            <X />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {collections.length > 0 ? (
            <>
              <Select
                value={addCollectionId}
                onValueChange={setAddCollectionId}
                disabled={collectionsBusy}
              >
                <SelectTrigger className="h-11 w-full min-w-[11rem] touch-manipulation sm:h-9 sm:w-[13rem]">
                  <SelectValue placeholder={t('addPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="h-11 touch-manipulation sm:h-9"
                disabled={collectionsBusy || !canAdd}
                onClick={addSelectedToCollection}
              >
                {t('addToCollection')}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('createFirstHint')}</p>
          )}
          {canRemove ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 touch-manipulation sm:h-9"
              disabled={collectionsBusy}
              onClick={removeSelectedFromCurrent}
            >
              {currentCollectionName
                ? t('removeFromNamed', { name: currentCollectionName })
                : t('removeFromCollection')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
