'use client'

import { useTranslations } from 'next-intl'
import { CopyIcon, ImageIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { ScrollArea, ScrollBar } from '@workspace/ui/components/scroll-area'
import { Spinner } from '@workspace/ui/components/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'

import type { InstagramItemPageDto } from '@/lib/graphql/queries/instagram-items'

import type { InstagramItemKind } from './use-instagram-items'

type InstagramItemPagesStripProps = {
  pages: InstagramItemPageDto[]
  selectedPageId: string | null
  kind: InstagramItemKind
  busy: boolean
  canAddPage: boolean
  canDuplicatePage: boolean
  canDeletePage: boolean
  isAddingPage: boolean
  isDuplicatingPage: boolean
  onSelectPage: (pageId: string) => void
  onAddPage: () => void
  onDuplicatePage: () => void
  onRequestDeletePage: () => void
}

function pageThumbClass(kind: InstagramItemKind): string {
  if (kind === 'post') return 'aspect-square h-16'
  return 'aspect-[9/16] h-[4.5rem]'
}

export function InstagramItemPagesStrip({
  pages,
  selectedPageId,
  kind,
  busy,
  canAddPage,
  canDuplicatePage,
  canDeletePage,
  isAddingPage,
  isDuplicatingPage,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onRequestDeletePage,
}: InstagramItemPagesStripProps) {
  const t = useTranslations('analytics.workflows.instagramItems')
  const selectedIndex = Math.max(
    0,
    pages.findIndex((page) => page.id === selectedPageId),
  )

  return (
    <Field className="gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <FieldLabel>{t('pages.label')}</FieldLabel>
          <FieldDescription>{t('pages.description')}</FieldDescription>
        </div>
        {pages.length > 0 ? (
          <Badge className="shrink-0" variant="secondary">
            {t('pages.selectedIndicator', {
              current: selectedIndex + 1,
              total: pages.length,
            })}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5">
        <ScrollArea className="w-full whitespace-nowrap">
          <div
            className="flex w-max items-end gap-2 pb-1"
            role="listbox"
            aria-label={t('pages.label')}
          >
            {pages.map((page, index) => {
              const selected = page.id === selectedPageId
              const thumb = page.imageUrl
              return (
                <button
                  aria-label={t('pages.selectAria', { index: index + 1 })}
                  aria-selected={selected}
                  className={cn(
                    'relative shrink-0 overflow-hidden rounded-md border bg-muted/30 transition-colors',
                    pageThumbClass(kind),
                    selected
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border/60 hover:border-border hover:bg-muted/50',
                    busy && 'pointer-events-none opacity-60',
                  )}
                  disabled={busy}
                  key={page.id}
                  onClick={() => onSelectPage(page.id)}
                  role="option"
                  type="button"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                    <img alt="" className="size-full object-cover" src={thumb} />
                  ) : (
                    <span className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
                      <ImageIcon aria-hidden />
                      <span className="font-medium text-xs leading-none">{index + 1}</span>
                    </span>
                  )}
                  <Badge
                    className="absolute top-1 left-1 min-w-5 justify-center px-1"
                    variant={selected ? 'default' : 'secondary'}
                  >
                    {index + 1}
                  </Badge>
                </button>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <ButtonGroup aria-label={t('pages.actionsAria')}>
          <Button
            disabled={!canAddPage}
            onClick={onAddPage}
            size="sm"
            type="button"
            variant="outline"
          >
            {isAddingPage ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            {t('pages.add')}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t('pages.duplicate')}
                disabled={!canDuplicatePage}
                onClick={onDuplicatePage}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                {isDuplicatingPage ? <Spinner /> : <CopyIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('pages.duplicate')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t('pages.delete')}
                disabled={!canDeletePage}
                onClick={onRequestDeletePage}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <Trash2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('pages.delete')}</TooltipContent>
          </Tooltip>
        </ButtonGroup>
      </div>
    </Field>
  )
}
