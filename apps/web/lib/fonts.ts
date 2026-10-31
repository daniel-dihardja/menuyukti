import localFont from 'next/font/local'

/**
 * Self-hosted variable fonts (latin). Using `next/font/local` avoids
 * build-time fetches to Google Fonts, which fail intermittently in Docker CI.
 */
export const fontSans = localFont({
  src: '../fonts/PlusJakartaSans-latin-wght-normal.woff2',
  display: 'swap',
  variable: '--font-sans',
  weight: '400 800',
})

/** Static ExtraBold cut for marketing display headlines (fuller than variable 800). */
export const fontDisplay = localFont({
  src: '../fonts/PlusJakartaSans-ExtraBold.ttf',
  display: 'swap',
  variable: '--font-display',
  weight: '800',
})

export const fontMono = localFont({
  src: '../fonts/JetBrainsMono-latin-wght-normal.woff2',
  display: 'swap',
  variable: '--font-mono',
  weight: '400 500',
})
