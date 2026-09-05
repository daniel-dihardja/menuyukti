'use client'

import { useEffect, useEffectEvent, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { useDesktopLayout } from '@/hooks/use-desktop-layout'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import { cn } from '@workspace/ui/lib/utils'

import {
  InventarAssistantPanel,
  INVENTAR_ASSISTANT_OPEN_ID,
} from './inventar-assistant-panel'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationId: number | null
  children: ReactNode
}

export function InventarAssistantShell({ open, onOpenChange, locationId, children }: Props) {
  const t = useTranslations('inventar')
  const isDesktop = useDesktopLayout()

  function focusOpenButton() {
    queueMicrotask(() => {
      document.getElementById(INVENTAR_ASSISTANT_OPEN_ID)?.focus()
    })
  }

  const closeAssistant = useEffectEvent(() => {
    onOpenChange(false)
    focusOpenButton()
  })

  useEffect(() => {
    if (!open || !isDesktop) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeAssistant()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, isDesktop])

  if (isDesktop) {
    return (
      <div
        className={cn(
          'flex w-full min-w-0 gap-4',
          open && 'min-h-[min(70dvh,720px)] items-stretch',
        )}
      >
        {open ? (
          <aside
            className={cn(
              'flex w-[min(32%,22rem)] min-w-[17.5rem] shrink-0 flex-col overflow-hidden',
              'rounded-lg border bg-background',
            )}
            aria-label={t('assistantTitle')}
          >
            <InventarAssistantPanel
              active={open}
              onClose={closeAssistant}
              locationId={locationId}
            />
          </aside>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    )
  }

  return (
    <>
      {children}
      <Drawer
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) focusOpenButton()
        }}
      >
        <DrawerContent
          className={cn(
            'flex h-[min(92dvh,900px)] max-h-[min(92dvh,900px)] flex-col gap-0',
            'pb-0',
            'overscroll-contain',
          )}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t('assistantTitle')}</DrawerTitle>
            <DrawerDescription>{t('assistantEmptyHint')}</DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {open ? (
              <InventarAssistantPanel
                active={open}
                onClose={closeAssistant}
                locationId={locationId}
                showCloseButton={false}
              />
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
