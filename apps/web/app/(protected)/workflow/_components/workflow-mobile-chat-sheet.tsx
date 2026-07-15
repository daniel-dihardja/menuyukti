'use client'

import type { ReactNode } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'
import { ChevronUp, MessageSquare } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useCloseLabel } from '@/hooks/use-close-label'
import { useWorkflowChatMeta } from './workflow-chat-context'

export type WorkflowMobileChatSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function WorkflowMobileChatSheet({
  open,
  onOpenChange,
  children,
}: WorkflowMobileChatSheetProps) {
  const t = useTranslations('analytics.workflows.chat')
  const closeLabel = useCloseLabel()
  const { isChatBusy, hasMessages } = useWorkflowChatMeta()

  return (
    <>
      <div className="shrink-0 border-t bg-background px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          aria-controls="workflow-mobile-chat"
          aria-expanded={open}
          aria-label={t('mobileChatOpenAriaLabel')}
          className={cn(
            'flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-colors',
            'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          onClick={() => onOpenChange(true)}
          type="button"
        >
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          >
            {isChatBusy ? <Spinner className="size-4" /> : <MessageSquare className="size-4" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-medium text-foreground text-sm">
              {t('mobileChatOpenLabel')}
            </span>
            <span className="truncate text-muted-foreground text-xs">
              {isChatBusy
                ? t('thinking')
                : hasMessages
                  ? t('mobileChatContinueHint')
                  : t('mobileChatEmptyHint')}
            </span>
          </span>
          <ChevronUp aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetContent
          id="workflow-mobile-chat"
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
              <SheetTitle className="text-sm">{t('mobileChatSheetTitle')}</SheetTitle>
              <SheetDescription className="sr-only">
                {t('mobileChatSheetDescription')}
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex min-h-0 flex-1 flex-col divide-y overflow-hidden">
            {open ? children : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
