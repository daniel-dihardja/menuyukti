/** Menuyukti Warm Editorial tokens — mirrored from packages/ui globals.css */

export type BrandColors = {
  canvas: string
  surface: string
  card: string
  ink: string
  inkMuted: string
  inkFaint: string
  border: string
  borderStrong: string
  accent: string
  accentHover: string
  accentSoft: string
  destructive: string
  success: string
  warning: string
  primaryForeground: string
}

export const menuyuktiColors: BrandColors = {
  canvas: '#f8f5f0',
  surface: '#f3eee7',
  card: '#ffffff',
  ink: '#171717',
  inkMuted: '#6b655f',
  inkFaint: '#9c968f',
  border: '#e7ded2',
  borderStrong: '#d9cfc3',
  accent: '#2fd4c7',
  accentHover: '#1eb8ac',
  accentSoft: '#b8f3dd',
  destructive: '#dc2626',
  success: '#16a34a',
  warning: '#f2b75a',
  primaryForeground: '#171717',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  button: 0,
} as const

export const typography = {
  hero: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  title: { fontSize: 28, fontWeight: '600' as const, lineHeight: 34 },
  pageTitle: { fontSize: 24, fontWeight: '600' as const, lineHeight: 30 },
  heading: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  mono: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
} as const

export const fonts = {
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemiBold: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
} as const

export const shadow = {
  warmSm: {
    shadowColor: 'rgb(82, 56, 30)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  warmMd: {
    shadowColor: 'rgb(82, 56, 30)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const
