'use client'

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
import { useTranslations } from 'next-intl'

import { usePostCreator } from '../_context/use-post-creator'

export function PostCreatorDeleteDialog() {
  const tPreview = useTranslations('postCreator.preview')
  const { state, actions } = usePostCreator()
  const { deleteDialogOpen, deleteTarget, isDeletingVersion } = state

  return (
    <AlertDialog
      open={deleteDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          actions.closeDeleteDialog()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deleteTarget === 'page'
              ? tPreview('removePageConfirmTitle')
              : tPreview('deleteConfirmTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget === 'page'
              ? tPreview('removePageConfirmDescription')
              : tPreview('deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingVersion} type="button">
            {tPreview('deleteConfirmCancel')}
          </AlertDialogCancel>
          <Button
            className={isDeletingVersion ? 'inline-flex items-center gap-2' : undefined}
            disabled={isDeletingVersion}
            onClick={() => void actions.confirmDelete()}
            type="button"
            variant="destructive"
          >
            {isDeletingVersion ? (
              <>
                <Spinner />
                {deleteTarget === 'page'
                  ? tPreview('removePageConfirmAction')
                  : tPreview('deleteConfirmAction')}
              </>
            ) : deleteTarget === 'page' ? (
              tPreview('removePageConfirmAction')
            ) : (
              tPreview('deleteConfirmAction')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
