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

export const fontMono = localFont({
  src: '../fonts/JetBrainsMono-latin-wght-normal.woff2',
  display: 'swap',
  variable: '--font-mono',
  weight: '400 500',
})
