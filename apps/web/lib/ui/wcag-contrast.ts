/** WCAG 2.x contrast helpers for design-token checks in unit tests. */

export type OklchColor = { l: number; c: number; h: number; alpha?: number }

export function parseOklch(value: string): OklchColor {
  const match = value
    .trim()
    .match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i)
  if (!match) {
    throw new Error(`Unsupported color: ${value}`)
  }
  const l = parseOklchChannel(match[1]!)
  const alpha = match[4] ? parseOklchChannel(match[4]) : 1
  return { l, c: Number(match[2]), h: Number(match[3]), alpha }
}

function parseOklchChannel(raw: string): number {
  if (raw.endsWith('%')) {
    return Number(raw.slice(0, -1)) / 100
  }
  return Number(raw)
}

function oklchToLinearRgb({ l, c, h }: OklchColor): [number, number, number] {
  const hueRad = (h * Math.PI) / 180
  const a = c * Math.cos(hueRad)
  const b = c * Math.sin(hueRad)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l + -0.1055613458 * a + -0.0638541728 * b
  const s_ = l + -0.0894841775 * a + -1.291485548 * b

  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3

  return [
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}

function linearToSrgb(channel: number): number {
  const abs = Math.abs(channel)
  if (abs <= 0.0031308) {
    return 12.92 * channel
  }
  return Math.sign(channel) * (1.055 * abs ** (1 / 2.4) - 0.055)
}

export function oklchToRgb(color: OklchColor): [number, number, number] {
  const [lr, lg, lb] = oklchToLinearRgb(color)
  const alpha = color.alpha ?? 1
  return [
    clamp01(linearToSrgb(lr) * alpha),
    clamp01(linearToSrgb(lg) * alpha),
    clamp01(linearToSrgb(lb) * alpha),
  ]
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function blendOver(background: OklchColor, foreground: OklchColor): OklchColor {
  const fgAlpha = foreground.alpha ?? 1
  if (fgAlpha <= 0) {
    return background
  }
  if (fgAlpha >= 1) {
    return foreground
  }

  const bgRgb = oklchToRgb(background)
  const fgRgb = oklchToRgb({ ...foreground, alpha: 1 })
  const mixed = bgRgb.map((bg, index) => bg * (1 - fgAlpha) + fgRgb[index]! * fgAlpha) as [
    number,
    number,
    number,
  ]

  return rgbToOklch(mixed)
}

function rgbToOklch([r, g, b]: [number, number, number]): OklchColor {
  const linear = [r, g, b].map((channel) => {
    const abs = Math.abs(channel)
    if (abs <= 0.04045) {
      return channel / 12.92
    }
    return Math.sign(channel) * ((abs + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  const l = 0.4122214708 * linear[0] + 0.5363325363 * linear[1] + 0.0514459929 * linear[2]
  const m = 0.2119034982 * linear[0] + 0.6806995451 * linear[1] + 0.1073969566 * linear[2]
  const s = 0.0883024619 * linear[0] + 0.2817188376 * linear[1] + 0.6299787005 * linear[2]

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.hypot(a, bVal)
  let h = (Math.atan2(bVal, a) * 180) / Math.PI
  if (h < 0) {
    h += 360
  }

  return { l: L, c, h }
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    return linear
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

export function contrastRatio(foreground: OklchColor, background: OklchColor): number {
  const fg = relativeLuminance(oklchToRgb(foreground))
  const bg = relativeLuminance(oklchToRgb(background))
  const lighter = Math.max(fg, bg)
  const darker = Math.min(fg, bg)
  return (lighter + 0.05) / (darker + 0.05)
}

export function mixAlphaOver(
  background: OklchColor,
  overlay: OklchColor,
  alpha: number,
): OklchColor {
  return blendOver(background, { ...overlay, alpha })
}

/** Parse simple theme tokens from packages/ui globals.css (:root / .dark blocks). */
export function readThemeTokensFromGlobals(css: string): {
  light: Record<string, OklchColor>
  dark: Record<string, OklchColor>
} {
  const light = parseBlock(css, ':root')
  const dark = parseBlock(css, '.dark')
  return { light, dark }
}

function parseBlock(css: string, selector: string): Record<string, OklchColor> {
  const escaped = selector.replace('.', '\\.')
  const blockRe = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 's')
  const match = css.match(blockRe)
  if (!match) {
    throw new Error(`Missing ${selector} block`)
  }
  const tokens: Record<string, OklchColor> = {}
  const declRe = /--([a-z0-9-]+):\s*(oklch\([^)]+\))/gi
  let decl: RegExpExecArray | null
  while ((decl = declRe.exec(match[1]!)) !== null) {
    tokens[decl[1]!] = parseOklch(decl[2]!)
  }
  return tokens
}

export const WCAG_AA_NORMAL_TEXT = 4.5
export const WCAG_AA_LARGE_TEXT = 3
export const WCAG_AA_UI_COMPONENT = 3
