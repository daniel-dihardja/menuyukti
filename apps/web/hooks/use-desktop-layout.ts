'use client'

import {
  COMPACT_LAYOUT_MEDIA_QUERY,
  DESKTOP_LAYOUT_MEDIA_QUERY,
} from '@workspace/ui/lib/layout-breakpoint'

import { useMediaQuery } from '@/hooks/use-media-query'

/** True from 1024px up — desktop layout (sidebar, tables, split panes). */
export function useDesktopLayout(): boolean {
  return useMediaQuery(DESKTOP_LAYOUT_MEDIA_QUERY)
}

/** True below 1024px — compact/mobile layout (sheets, cards, stacked UI). */
export function useCompactLayout(): boolean {
  return useMediaQuery(COMPACT_LAYOUT_MEDIA_QUERY)
}
