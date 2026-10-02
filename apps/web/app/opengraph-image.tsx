import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const alt = 'Menuyukti — Restaurant Marketing Agency | AI Strategy & Content'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const fontsDir = path.join(process.cwd(), 'fonts')

/** Static TTFs for Satori (`next/og` does not support WOFF2 / variable fonts). */
const fontMediumPromise = readFile(path.join(fontsDir, 'PlusJakartaSans-Medium.ttf'))
const fontSemiboldPromise = readFile(path.join(fontsDir, 'PlusJakartaSans-SemiBold.ttf'))
const fontBoldPromise = readFile(path.join(fontsDir, 'PlusJakartaSans-ExtraBold.ttf'))

export default async function Image() {
  const t = await getTranslations('metadata')
  const [fontMedium, fontSemibold, fontBold] = await Promise.all([
    fontMediumPromise,
    fontSemiboldPromise,
    fontBoldPromise,
  ])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: '#f8f5f0',
        color: '#1a1614',
        fontFamily: 'Plus Jakarta Sans',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 0,
            background: '#2fd4c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a1614',
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          M
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>Menuyukti</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 980 }}>
        <div
          style={{
            alignSelf: 'flex-start',
            borderRadius: 0,
            background: '#b8f3dd',
            color: '#1eb8ac',
            fontSize: 22,
            fontWeight: 600,
            padding: '10px 20px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {t('ogImageBadge')}
        </div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
          }}
        >
          {t('ogImageHeadline')}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            lineHeight: 1.45,
            color: '#6b655f',
            maxWidth: 900,
          }}
        >
          {t('ogImageTagline')}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 22,
          fontWeight: 600,
          color: '#9c968f',
        }}
      >
        <span>menuyukti.com</span>
        <span>Restaurants · Cafés · Bars</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Plus Jakarta Sans', data: fontMedium, weight: 500, style: 'normal' },
        { name: 'Plus Jakarta Sans', data: fontSemibold, weight: 600, style: 'normal' },
        { name: 'Plus Jakarta Sans', data: fontBold, weight: 800, style: 'normal' },
      ],
    },
  )
}
