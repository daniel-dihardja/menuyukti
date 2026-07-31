'use client'

import type { ReactNode } from 'react'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import { cn } from '@workspace/ui/lib/utils'
import { useTranslations } from 'next-intl'

export const CHAT_MOBILE_ARTIFACT_ID = 'chat-mobile-artifact'

export type ChatMobileArtifactSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /** Optional drawer title override. */
  title?: string | null
}

export function ChatMobileArtifactSheet({
  open,
  onOpenChange,
  children,
  title,
}: ChatMobileArtifactSheetProps) {
  const t = useTranslations('chat')
  const drawerTitle = title?.trim() || t('mobileArtifactSheetTitle')

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent
        id={CHAT_MOBILE_ARTIFACT_ID}
        className={cn(
          'flex h-[min(92dvh,900px)] max-h-[min(92dvh,900px)] flex-col gap-0',
          'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
          'overscroll-contain',
        )}
      >
        <DrawerHeader className="shrink-0 gap-1 px-4 pt-1 pb-2 text-left">
          <DrawerTitle className="text-sm">{drawerTitle}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {t('mobileArtifactSheetDescription')}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-0">
          {open ? children : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
