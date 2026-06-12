export const STYLE_PALETTES = [
  'amber',
  'saffron',
  'nectar',
  'coral',
  'hearth',
  'terracotta',
  'brass',
  'sage',
  'bistro',
  'espresso',
] as const

export type StylePalette = (typeof STYLE_PALETTES)[number]

export const STYLE_PALETTE_STORAGE_KEY = 'menuyukti-style-palette'

export const DEFAULT_STYLE_PALETTE: StylePalette = 'espresso'

/** Primary swatch per palette for menu previews (OKLCH CSS color). */
export const STYLE_PALETTE_SWATCHES: Record<StylePalette, string> = {
  amber: 'oklch(0.58 0.17 58)',
  saffron: 'oklch(0.64 0.17 75)',
  nectar: 'oklch(0.66 0.19 55)',
  coral: 'oklch(0.62 0.18 25)',
  hearth: 'oklch(0.57 0.16 42)',
  terracotta: 'oklch(0.55 0.14 45)',
  brass: 'oklch(0.55 0.13 62)',
  sage: 'oklch(0.52 0.12 145)',
  bistro: 'oklch(0.42 0.14 18)',
  espresso: 'oklch(0.42 0.08 55)',
}

export function isStylePalette(value: string): value is StylePalette {
  return (STYLE_PALETTES as readonly string[]).includes(value)
}

export function stylePaletteScript(): string {
  const allowed = STYLE_PALETTES.map((id) => `'${id}'`).join(',')
  return `(function(){try{var v=[${allowed}];var p=localStorage.getItem('${STYLE_PALETTE_STORAGE_KEY}');if(v.indexOf(p)!==-1)document.documentElement.dataset.palette=p;}catch(e){}})();`
}
