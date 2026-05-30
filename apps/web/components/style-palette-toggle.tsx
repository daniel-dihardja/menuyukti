'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { SidebarMenuButton, useSidebar } from '@workspace/ui/components/sidebar'
import { Button } from '@workspace/ui/components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip'
import { Palette } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useStylePalette } from '@/components/style-palette-provider'
import { STYLE_PALETTE_OPTIONS } from '@/lib/style-palette-options'
import { STYLE_PALETTE_SWATCHES, type StylePalette } from '@/lib/style-palette'

function PaletteMenuItems() {
  const t = useTranslations('stylePalette')
  const { palette, setPalette } = useStylePalette()

  return (
    <DropdownMenuRadioGroup
      value={palette}
      onValueChange={(value) => setPalette(value as StylePalette)}
    >
      {STYLE_PALETTE_OPTIONS.map(({ id, icon: Icon }) => (
        <DropdownMenuRadioItem key={id} value={id} className="gap-2">
          <Icon
            className="size-4 shrink-0"
            style={{ color: STYLE_PALETTE_SWATCHES[id] }}
            aria-hidden
          />
          <span className="truncate">{t(id)}</span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

const paletteMenuClassName = 'max-h-[min(20rem,70vh)] min-w-[12.5rem] overflow-y-auto'

function usePaletteTriggerIcon() {
  const { palette } = useStylePalette()
  return STYLE_PALETTE_OPTIONS.find((option) => option.id === palette)?.icon ?? Palette
}

export function SidebarStylePaletteToggle() {
  const t = useTranslations('stylePalette')
  const { state, isMobile } = useSidebar()
  const [mounted, setMounted] = React.useState(false)
  const Icon = usePaletteTriggerIcon()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const triggerButton = (
    <SidebarMenuButton
      type="button"
      className="w-full data-[state=open]:bg-sidebar-accent"
      aria-label={t('label')}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate group-data-[collapsible=icon]:hidden">{t('label')}</span>
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
            {t('label')}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent className={paletteMenuClassName} align="start" side="bottom">
        <PaletteMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function HeaderStylePaletteToggle() {
  const t = useTranslations('stylePalette')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label={t('label')}
        >
          <Palette className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={paletteMenuClassName} align="end" side="bottom">
        <PaletteMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
