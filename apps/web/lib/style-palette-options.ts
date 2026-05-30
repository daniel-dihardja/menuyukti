import type { LucideIcon } from 'lucide-react'
import { Coffee, Flower2, Leaf, Soup, SunMedium, Wine } from 'lucide-react'

import { STYLE_PALETTES, type StylePalette } from '@/lib/style-palette'

export type StylePaletteOption = {
  id: StylePalette
  icon: LucideIcon
}

export const STYLE_PALETTE_OPTIONS: StylePaletteOption[] = [
  { id: 'amber', icon: SunMedium },
  { id: 'coral', icon: Flower2 },
  { id: 'sage', icon: Leaf },
  { id: 'terracotta', icon: Soup },
  { id: 'bistro', icon: Wine },
  { id: 'espresso', icon: Coffee },
]

/** Ensures options stay in sync with STYLE_PALETTES. */
STYLE_PALETTES satisfies readonly StylePalette[]
