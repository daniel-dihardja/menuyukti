'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

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
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Input } from '@workspace/ui/components/input'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'

import { useCompactLayout } from '@/hooks/use-desktop-layout'

import { useMediaActions, useMediaState } from './media-context'

function CollectionNameFormShell({
  open,
  onOpenChange,
  title,
  compact,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  compact: boolean
  children: ReactNode
  footer: ReactNode
}) {
  if (compact) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-3 px-4">{children}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">{children}</div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MediaCollectionsBar() {
  const t = useTranslations('media.collections')
  const compact = useCompactLayout()
  const { collections, collectionFilter, collectionsBusy } = useMediaState()
  const { handleFilterChange, createCollection, renameCollection, deleteCollection } =
    useMediaActions()
  const [createOpen, setCreateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedCollection =
    typeof collectionFilter === 'number' ? collections.find((c) => c.id === collectionFilter) : null

  const toggleValue = collectionFilter === 'all' ? 'all' : String(collectionFilter)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
          <ToggleGroup
            type="single"
            value={toggleValue}
            onValueChange={(value) => {
              if (!value) return
              if (value === 'all') handleFilterChange('all')
              else handleFilterChange(Number.parseInt(value, 10))
            }}
            className="inline-flex w-max flex-nowrap justify-start gap-1"
            disabled={collectionsBusy}
          >
            <ToggleGroupItem value="all" className="h-11 shrink-0 touch-manipulation px-3 sm:h-9">
              {t('filterAll')}
            </ToggleGroupItem>
            {collections.map((c) => (
              <ToggleGroupItem
                key={c.id}
                value={String(c.id)}
                className="h-11 shrink-0 touch-manipulation px-3 sm:h-9"
              >
                {c.name}
                <span className="ml-1 text-muted-foreground">({c.memberCount})</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 touch-manipulation sm:h-9"
            disabled={collectionsBusy}
            onClick={() => {
              setNameDraft('')
              setCreateOpen(true)
            }}
          >
            <FolderPlus />
            {t('create')}
          </Button>
          {selectedCollection ? (
            compact ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 touch-manipulation sm:h-9"
                    disabled={collectionsBusy}
                    aria-label={t('manage')}
                  >
                    <MoreHorizontal />
                    {t('manage')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() => {
                        setNameDraft(selectedCollection.name)
                        setRenameOpen(true)
                      }}
                    >
                      <Pencil />
                      {t('rename')}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                      <Trash2 />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={collectionsBusy}
                  onClick={() => {
                    setNameDraft(selectedCollection.name)
                    setRenameOpen(true)
                  }}
                >
                  <Pencil />
                  {t('rename')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={collectionsBusy}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  {t('delete')}
                </Button>
              </>
            )
          ) : null}
        </div>
      </div>

      <CollectionNameFormShell
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('createTitle')}
        compact={compact}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              disabled={submitting || !nameDraft.trim()}
              onClick={() => {
                void (async () => {
                  setSubmitting(true)
                  try {
                    const ok = await createCollection(nameDraft.trim())
                    if (ok) setCreateOpen(false)
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
              {t('create')}
            </Button>
          </>
        }
      >
        <Input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder={t('namePlaceholder')}
          maxLength={128}
          name="collectionName"
          autoComplete="off"
          autoFocus={!compact}
        />
      </CollectionNameFormShell>

      <CollectionNameFormShell
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={t('renameTitle')}
        compact={compact}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              disabled={submitting || !nameDraft.trim() || !selectedCollection}
              onClick={() => {
                if (!selectedCollection) return
                void (async () => {
                  setSubmitting(true)
                  try {
                    const ok = await renameCollection(selectedCollection.id, nameDraft.trim())
                    if (ok) setRenameOpen(false)
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
              {t('save')}
            </Button>
          </>
        }
      >
        <Input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder={t('namePlaceholder')}
          maxLength={128}
          name="collectionName"
          autoComplete="off"
          autoFocus={!compact}
        />
      </CollectionNameFormShell>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm', { name: selectedCollection?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting || !selectedCollection}
              onClick={() => {
                if (!selectedCollection) return
                void (async () => {
                  setSubmitting(true)
                  try {
                    const ok = await deleteCollection(selectedCollection.id)
                    if (ok) setDeleteOpen(false)
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
