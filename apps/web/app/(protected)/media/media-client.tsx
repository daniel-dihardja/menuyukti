'use client'

import { useTranslations } from 'next-intl'
import { AlertCircle, ChevronDown } from 'lucide-react'

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
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

import { ContentMediaPreviewDialog } from '@/app/(protected)/content/_components/content-media-preview-dialog'

import { MediaCollectionsBar } from './_components/media-collections-bar'
import { MediaContentGrid } from './_components/media-content-grid'
import { useMediaActions, useMediaState } from './_components/media-context'
import { MediaOrganizeBar } from './_components/media-organize-bar'
import { MediaProvider } from './_components/media-provider'
import { MediaUploadZone } from './_components/media-upload-zone'

function MediaClientView() {
  const t = useTranslations('media')
  const { selected, organizeBarHeight, items, loadError, loading, pendingDeleteName, preview } =
    useMediaState()
  const { retryLoad, setPendingDeleteName, confirmDelete, setPreview } = useMediaActions()

  return (
    <div
      className={cn('flex w-full flex-col gap-6')}
      style={
        selected && organizeBarHeight > 0
          ? { paddingBottom: `calc(${organizeBarHeight}px + 0.75rem)` }
          : undefined
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-pretty text-sm text-muted-foreground">{t('descriptionShort')}</p>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-auto justify-start gap-1 px-0 py-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground [&[data-state=open]>svg]:rotate-180"
            >
              {t('collections.helpToggle')}
              <ChevronDown className="size-4 transition-transform" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="pt-1 text-pretty text-sm text-muted-foreground">
              {t('collections.help')}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <MediaCollectionsBar />

      {!selected && items.length > 0 && !loadError ? (
        <p className="text-sm text-muted-foreground">{t('collections.selectHint')}</p>
      ) : null}

      <MediaUploadZone />

      {loadError && !loading ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t('grid.loadErrorTitle')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{t('grid.loadErrorDescription')}</span>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-fit touch-manipulation border-destructive/40 sm:h-9"
              onClick={retryLoad}
            >
              {t('grid.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <MediaContentGrid />
      )}

      <MediaOrganizeBar />

      <AlertDialog
        open={pendingDeleteName != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteName(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('grid.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('grid.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('grid.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteName) confirmDelete(pendingDeleteName)
              }}
            >
              {t('grid.deleteAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContentMediaPreviewDialog
        item={preview}
        onClose={() => setPreview(null)}
        closeLabel={t('preview.close')}
      />
    </div>
  )
}

export function MediaClient() {
  return (
    <MediaProvider>
      <MediaClientView />
    </MediaProvider>
  )
}
