'use client'

import * as React from 'react'

import {
  DEFAULT_STYLE_PALETTE,
  isStylePalette,
  STYLE_PALETTE_STORAGE_KEY,
  type StylePalette,
} from '@/lib/style-palette'

type StylePaletteContextValue = {
  palette: StylePalette
  setPalette: (palette: StylePalette) => void
}

const StylePaletteContext = React.createContext<StylePaletteContextValue | null>(null)

function applyPaletteToDocument(palette: StylePalette) {
  document.documentElement.dataset.palette = palette
}

export function StylePaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = React.useState<StylePalette>(DEFAULT_STYLE_PALETTE)

  React.useEffect(() => {
    const stored = localStorage.getItem(STYLE_PALETTE_STORAGE_KEY)
    if (stored && isStylePalette(stored)) {
      setPaletteState(stored)
      applyPaletteToDocument(stored)
    } else {
      applyPaletteToDocument(DEFAULT_STYLE_PALETTE)
    }
  }, [])

  const setPalette = React.useCallback((next: StylePalette) => {
    setPaletteState(next)
    localStorage.setItem(STYLE_PALETTE_STORAGE_KEY, next)
    applyPaletteToDocument(next)
  }, [])

  const value = React.useMemo(() => ({ palette, setPalette }), [palette, setPalette])

  return <StylePaletteContext value={value}>{children}</StylePaletteContext>
}

export function useStylePalette() {
  const context = React.use(StylePaletteContext)
  if (!context) {
    throw new Error('useStylePalette must be used within StylePaletteProvider')
  }
  return context
}
