'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MoreHorizontal, Pencil } from 'lucide-react'

import type { ImageAiFlowRow } from '@/lib/graphql/queries'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Spinner } from '@workspace/ui/components/spinner'

type Props = {
  flow: ImageAiFlowRow
  onEdit: (flow: ImageAiFlowRow) => void
  onDelete: (flow: ImageAiFlowRow) => Promise<void>
}

export function ImageFlowCard({ flow, onEdit, onDelete }: Props) {
  const t = useTranslations('imageFlows')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const promptPreview =
    flow.prompt.length > 160 ? `${flow.prompt.slice(0, 160).trim()}…` : flow.prompt

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      await onDelete(flow)
      setConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="flex min-h-0 flex-col overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="min-w-0 gap-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-pretty text-base leading-snug">
                {flow.displayName}
              </CardTitle>
              <CardDescription className="mt-1 font-mono text-xs" translate="no">
                {flow.slug}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={flow.isActive ? 'default' : 'secondary'}>
                {flow.isActive ? t('badgeActive') : t('badgeInactive')}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('actions')}
                  >
                    <MoreHorizontal className="size-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => onEdit(flow)}>
                      <Pencil className="size-4" aria-hidden />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2 pb-3">
          <p className="text-xs font-medium text-muted-foreground">{t('cardModel')}</p>
          <p className="truncate font-mono text-sm" translate="no">
            {flow.model}
          </p>
          <p className="text-xs font-medium text-muted-foreground">{t('cardPromptPreview')}</p>
          <p className="line-clamp-3 text-sm text-muted-foreground">{promptPreview}</p>
        </CardContent>
        <CardFooter className="border-t border-border/50 pt-3 text-xs tabular-nums text-muted-foreground">
          {t('sortOrder')}: {flow.sortOrder}
        </CardFooter>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="overflow-y-auto overscroll-contain">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('deleteCancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeleteConfirm()}
            >
              {deleting ? (
                <>
                  <Spinner className="size-4" />
                  {t('loading')}
                </>
              ) : (
                t('deleteConfirm')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
