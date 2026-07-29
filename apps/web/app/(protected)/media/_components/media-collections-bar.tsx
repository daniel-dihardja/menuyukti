'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FolderPlus, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'
import { cn } from '@workspace/ui/lib/utils'

import type { MediaCollection } from '@/lib/media/client-api'

export type MediaCollectionsBarProps = {
  collections: MediaCollection[]
  selectedKey: 'all' | number
  onSelect: (key: 'all' | number) => void
  onCreate: (name: string) => Promise<boolean>
  onRename: (id: number, name: string) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
  busy?: boolean
}

export function MediaCollectionsBar({
  collections,
  selectedKey,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  busy = false,
}: MediaCollectionsBarProps) {
  const t = useTranslations('media.collections')
  const [createOpen, setCreateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedCollection =
    typeof selectedKey === 'number' ? collections.find((c) => c.id === selectedKey) : null

  const toggleValue = selectedKey === 'all' ? 'all' : String(selectedKey)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={toggleValue}
          onValueChange={(value) => {
            if (!value) return
            if (value === 'all') onSelect('all')
            else onSelect(Number.parseInt(value, 10))
          }}
          className="flex flex-wrap justify-start gap-1"
          disabled={busy}
        >
          <ToggleGroupItem value="all" className="px-3">
            {t('filterAll')}
          </ToggleGroupItem>
          {collections.map((c) => (
            <ToggleGroupItem key={c.id} value={String(c.id)} className="px-3">
              {c.name}
              <span className="ml-1 text-muted-foreground">({c.memberCount})</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              setNameDraft('')
              setCreateOpen(true)
            }}
          >
            <FolderPlus className="size-4" aria-hidden />
            {t('create')}
          </Button>
          {selectedCollection ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setNameDraft(selectedCollection.name)
                  setRenameOpen(true)
                }}
              >
                <Pencil className="size-4" aria-hidden />
                {t('rename')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                {t('delete')}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={128}
            autoFocus
          />
          <DialogFooter>
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
                    const ok = await onCreate(nameDraft.trim())
                    if (ok) setCreateOpen(false)
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('renameTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={128}
            autoFocus
          />
          <DialogFooter>
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
                    const ok = await onRename(selectedCollection.id, nameDraft.trim())
                    if (ok) setRenameOpen(false)
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className={cn('text-sm text-muted-foreground')}>
            {t('deleteConfirm', { name: selectedCollection?.name ?? '' })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={submitting || !selectedCollection}
              onClick={() => {
                if (!selectedCollection) return
                void (async () => {
                  setSubmitting(true)
                  try {
                    const ok = await onDelete(selectedCollection.id)
                    if (ok) setDeleteOpen(false)
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
