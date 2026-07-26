'use client'

import type { ReactNode } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { cn } from '@workspace/ui/lib/utils'
import { useTranslations } from 'next-intl'

import { useCloseLabel } from '@/hooks/use-close-label'

export type WorkflowMobileArtifactSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /** Optional sheet title override (e.g. selected milestone title). */
  title?: string | null
}

export function WorkflowMobileArtifactSheet({
  open,
  onOpenChange,
  children,
  title,
}: WorkflowMobileArtifactSheetProps) {
  const t = useTranslations('analytics.workflows.chat')
  const closeLabel = useCloseLabel()
  const sheetTitle = title?.trim() || t('mobileArtifactSheetTitle')

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        id="workflow-mobile-artifact"
        side="bottom"
        closeLabel={closeLabel}
        className={cn(
          'flex h-[min(92dvh,900px)] flex-col gap-0 rounded-t-xl border-t p-0',
          'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
          'data-[state=closed]:pointer-events-none',
        )}
      >
        <div className="flex shrink-0 flex-col items-center gap-2 px-4 pt-3 pb-1">
          <div aria-hidden className="h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
          <SheetHeader className="w-full p-0 text-left">
            <SheetTitle className="text-sm">{sheetTitle}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('mobileArtifactSheetDescription')}
            </SheetDescription>
          </SheetHeader>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-0">
          {open ? children : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
