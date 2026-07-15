'use client'

import { useTranslations } from 'next-intl'

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
import { Spinner } from '@workspace/ui/components/spinner'

import type { PostListItem } from './posts-table-types'

type DeletePostDialogProps = {
  pendingDelete: PostListItem | null
  deleting: boolean
  deleteError: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeletePostDialog({
  pendingDelete,
  deleting,
  deleteError,
  onOpenChange,
  onConfirm,
}: DeletePostDialogProps) {
  const t = useTranslations('posts.table')

  return (
    <AlertDialog open={pendingDelete !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
          {deleteError ? (
            <p className="text-destructive text-sm" role="alert">
              {deleteError}
            </p>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} type="button">
            {t('deleteConfirmCancel')}
          </AlertDialogCancel>
          <Button
            className={deleting ? 'inline-flex items-center gap-2' : undefined}
            disabled={deleting}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {deleting ? (
              <>
                <Spinner />
                {t('deleteConfirmAction')}
              </>
            ) : (
              t('deleteConfirmAction')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
