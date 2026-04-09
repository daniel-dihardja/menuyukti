'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { SidebarMenuButton, useSidebar } from '@workspace/ui/components/sidebar'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import * as React from 'react'

function ThemeTriggerIcon({ theme }: { theme: string | undefined }) {
  if (theme === 'dark') {
    return <Moon className="size-4 shrink-0" aria-hidden />
  }
  if (theme === 'light') {
    return <Sun className="size-4 shrink-0" aria-hidden />
  }
  return <Monitor className="size-4 shrink-0" aria-hidden />
}

export function SidebarThemeToggle() {
  const t = useTranslations('sidebar')
  const { theme, setTheme } = useTheme()
  const { state, isMobile } = useSidebar()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const resolvedValue =
    theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system'

  if (!mounted) {
    return (
      <div
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-2',
          'text-sidebar-foreground',
        )}
        aria-hidden
      >
        <Skeleton className="size-4 shrink-0 rounded" />
        <Skeleton className="h-4 max-w-[6rem] flex-1 rounded group-data-[collapsible=icon]:hidden" />
      </div>
    )
  }

  const triggerButton = (
    <SidebarMenuButton
      type="button"
      className="w-full data-[state=open]:bg-sidebar-accent"
      aria-label={t('theme.label')}
    >
      <ThemeTriggerIcon theme={theme} />
      <span className="truncate group-data-[collapsible=icon]:hidden">{t('theme.label')}</span>
    </SidebarMenuButton>
  )

  return (
    <DropdownMenu>
      {state === 'collapsed' && !isMobile ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {t('theme.label')}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent className="min-w-[10rem]" align="start" side="bottom">
        <DropdownMenuRadioGroup value={resolvedValue} onValueChange={(value) => setTheme(value)}>
          <DropdownMenuRadioItem value="light" className="gap-2">
            <Sun className="size-4" aria-hidden />
            {t('theme.light')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="gap-2">
            <Moon className="size-4" aria-hidden />
            {t('theme.dark')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="gap-2">
            <Monitor className="size-4" aria-hidden />
            {t('theme.system')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
