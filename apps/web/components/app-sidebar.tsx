'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from '@workspace/ui/components/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'
import { Leaf } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { NavMain } from './nav-main'

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
    </Sidebar>
  )
}
