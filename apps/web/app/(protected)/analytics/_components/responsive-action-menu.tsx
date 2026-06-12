'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronUp, MoreHorizontal } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Separator } from '@workspace/ui/components/separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { cn } from '@workspace/ui/lib/utils'

export type ResponsiveActionMenuItem = {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  onSelect?: () => void
  destructive?: boolean
  separatorBefore?: boolean
}

type ResponsiveActionMenuProps = {
  items: ResponsiveActionMenuItem[]
  sheetTitle: string
  desktopTriggerAriaLabel: string
  mobileTriggerLabel: string
  sheetDescription: string
  sheetId?: string
}

function SheetActionItems({
  items,
  onClose,
}: {
  items: ResponsiveActionMenuItem[]
  onClose: () => void
}) {
  return (
    <div className="flex flex-col gap-1 px-4 pb-4">
      {items.map((item) => {
        const Icon = item.icon
        const buttonClassName = cn(
          'h-auto min-h-11 w-full touch-manipulation justify-start px-3 py-3 text-sm font-medium',
          item.destructive
            ? 'text-destructive hover:text-destructive'
            : 'text-muted-foreground hover:text-foreground',
        )

        return (
          <div key={item.id} className="flex flex-col gap-1">
            {item.separatorBefore ? <Separator className="my-2" /> : null}
            {item.href ? (
              <SheetClose asChild>
                <Button asChild variant="ghost" className={buttonClassName}>
                  <Link href={item.href}>
                    <Icon aria-hidden data-icon="inline-start" />
                    {item.label}
                  </Link>
                </Button>
              </SheetClose>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className={buttonClassName}
                onClick={() => {
                  onClose()
                  item.onSelect?.()
                }}
              >
                <Icon aria-hidden data-icon="inline-start" />
                {item.label}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ResponsiveActionMenu({
  items,
  sheetTitle,
  desktopTriggerAriaLabel,
  mobileTriggerLabel,
  sheetDescription,
  sheetId,
}: ResponsiveActionMenuProps) {
  const [open, setOpen] = useState(false)
  const resolvedSheetId = sheetId ?? 'sales-report-actions'

  return (
    <>
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={desktopTriggerAriaLabel}
              className="size-8"
              size="icon"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {items.map((item) => {
              const Icon = item.icon
              const itemClassName = cn(
                'flex items-center gap-2',
                item.destructive && 'text-destructive focus:text-destructive',
              )

              return (
                <div key={item.id}>
                  {item.separatorBefore ? <DropdownMenuSeparator /> : null}
                  {item.href ? (
                    <DropdownMenuItem asChild>
                      <Link href={item.href} className={itemClassName}>
                        <Icon aria-hidden className="size-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className={itemClassName}
                      onSelect={(event) => {
                        if (item.onSelect) {
                          event.preventDefault()
                          item.onSelect()
                        }
                      }}
                    >
                      <Icon aria-hidden className="size-4" />
                      {item.label}
                    </DropdownMenuItem>
                  )}
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="md:hidden">
        <Button
          aria-controls={resolvedSheetId}
          aria-expanded={open}
          aria-label={mobileTriggerLabel}
          className="min-h-11 w-full touch-manipulation"
          onClick={() => setOpen(true)}
          type="button"
          variant="outline"
        >
          {mobileTriggerLabel}
          <ChevronUp aria-hidden data-icon="inline-end" />
        </Button>

        <Sheet onOpenChange={setOpen} open={open}>
          <SheetContent
            forceMount
            id={resolvedSheetId}
            side="bottom"
            className={cn(
              'flex max-h-[min(85dvh,640px)] flex-col gap-0 rounded-t-xl border-t p-0',
              'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
              'data-[state=closed]:pointer-events-none',
            )}
          >
            <div className="flex shrink-0 flex-col items-center gap-2 px-4 pt-3 pb-1">
              <div aria-hidden className="h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
              <SheetHeader className="w-full p-0 text-left">
                <SheetTitle className="truncate text-sm">{sheetTitle}</SheetTitle>
                <SheetDescription className="sr-only">{sheetDescription}</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <SheetActionItems items={items} onClose={() => setOpen(false)} />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
