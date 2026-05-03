'use client'

import { Show, UserButton } from '@clerk/nextjs'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@workspace/ui/components/sidebar'
import { Separator } from '@workspace/ui/components/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'
import { Leaf } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { menuyuktiClerkAppearance } from '@/components/clerk/menuyukti-appearance'
import { routes } from '@/lib/routes'
import { NavMain } from './nav-main'
import { SidebarThemeToggle } from './sidebar-theme-toggle'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('sidebar')
  const { state } = useSidebar()

  const brandLabel = t('groupLabel')

  const brandLink = (
    <Link
      href="/"
      aria-label={state === 'collapsed' ? brandLabel : undefined}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-sidebar-foreground',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'justify-start group-data-[collapsible=icon]:justify-center',
      )}
    >
      <Leaf className="size-4 shrink-0" aria-hidden />
      <span className="truncate group-data-[collapsible=icon]:hidden">{brandLabel}</span>
    </Link>
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className={cn('h-16 min-h-16 border-b', 'flex flex-row items-center gap-0')}>
        {state === 'collapsed' ? (
          <Tooltip>
            <TooltipTrigger asChild>{brandLink}</TooltipTrigger>
            <TooltipContent side="right" align="center">
              {brandLabel}
            </TooltipContent>
          </Tooltip>
        ) : (
          brandLink
        )}
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <Separator className="bg-sidebar-border" />
      <SidebarFooter className="pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Show when="signed-in">
              <div
                className={cn(
                  'flex w-full min-w-0 items-center gap-2 px-2 py-1.5',
                  'group-data-[collapsible=icon]:justify-center',
                )}
                role="group"
                aria-label={t('accountMenuAria')}
              >
                <UserButton
                  appearance={menuyuktiClerkAppearance}
                  userProfileMode="navigation"
                  userProfileUrl={routes.profileAccount}
                />
              </div>
            </Show>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
