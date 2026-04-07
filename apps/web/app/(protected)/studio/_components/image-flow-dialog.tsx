'use client'

import { useTranslations } from 'next-intl'

import type { ImageAiFlowRow } from '@/lib/graphql/queries'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { ImageFlowForm, type ImageFlowFormValues } from './image-flow-form'

type Props = {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  flow: ImageAiFlowRow | null
  onSubmit: (values: ImageFlowFormValues, styleIds: string[] | null) => Promise<void>
}

export function ImageFlowDialog({ mode, open, onOpenChange, flow, onSubmit }: Props) {
  const t = useTranslations('imageFlows')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,800px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? t('createTitle') : t('editTitle')}</DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'create' ? t('createTitle') : t('editTitle')}
          </DialogDescription>
        </DialogHeader>
        <ImageFlowForm
          key={mode === 'edit' && flow ? flow.id : 'create'}
          mode={mode}
          initial={mode === 'edit' ? flow : null}
          onSubmit={async (values, styleIds) => {
            await onSubmit(values, styleIds)
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
