import type { LucideIcon } from 'lucide-react'
import {
  Citrus,
  Coffee,
  Flame,
  Flower2,
  Gem,
  Leaf,
  Soup,
  Sparkles,
  SunMedium,
  Wine,
} from 'lucide-react'

import { STYLE_PALETTES, type StylePalette } from '@/lib/style-palette'

export type StylePaletteOption = {
  id: StylePalette
  icon: LucideIcon
}

export const STYLE_PALETTE_OPTIONS: StylePaletteOption[] = [
  { id: 'amber', icon: SunMedium },
  { id: 'saffron', icon: Sparkles },
  { id: 'nectar', icon: Citrus },
  { id: 'coral', icon: Flower2 },
  { id: 'hearth', icon: Flame },
  { id: 'terracotta', icon: Soup },
  { id: 'brass', icon: Gem },
  { id: 'sage', icon: Leaf },
  { id: 'bistro', icon: Wine },
  { id: 'espresso', icon: Coffee },
]

/** Ensures options stay in sync with STYLE_PALETTES. */
STYLE_PALETTES satisfies readonly StylePalette[]
