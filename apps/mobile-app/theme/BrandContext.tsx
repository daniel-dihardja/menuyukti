import { createContext, useContext, useMemo, type ReactNode } from 'react'

import {
  fonts,
  menuyuktiColors,
  radius,
  shadow,
  spacing,
  typography,
  type BrandColors,
} from './tokens'

export type BrandConfig = {
  name: string
  tagline: string
  colors: BrandColors
}

export type BrandContextValue = BrandConfig & {
  spacing: typeof spacing
  radius: typeof radius
  typography: typeof typography
  fonts: typeof fonts
  shadow: typeof shadow
}

const defaultBrand: BrandConfig = {
  name: 'Menuyukti',
  tagline: 'Offers & rewards from your favorite spots',
  colors: menuyuktiColors,
}

const BrandContext = createContext<BrandContextValue | null>(null)

type BrandProviderProps = {
  children: ReactNode
  /** Override restaurant name, tagline, or colors for white-label builds. */
  brand?: Partial<BrandConfig>
}

export function BrandProvider({ children, brand }: BrandProviderProps) {
  const value = useMemo<BrandContextValue>(() => {
    const colors = brand?.colors ? { ...menuyuktiColors, ...brand.colors } : menuyuktiColors
    return {
      name: brand?.name ?? defaultBrand.name,
      tagline: brand?.tagline ?? defaultBrand.tagline,
      colors,
      spacing,
      radius,
      typography,
      fonts,
      shadow,
    }
  }, [brand])

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext)
  if (!ctx) {
    throw new Error('useBrand must be used within BrandProvider')
  }
  return ctx
}
