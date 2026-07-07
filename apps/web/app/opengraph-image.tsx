import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const alt = 'Menuyukti — Restaurant Marketing Agency | AI Strategy & Content'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadGoogleFont(weight: number): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}&display=swap`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
  ).then((res) => res.text())

  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype|woff2?)'\)/)
  if (!match?.[1]) {
    throw new Error(`Plus Jakarta Sans (${weight}) font URL not found`)
  }

  return fetch(match[1]).then((res) => res.arrayBuffer())
}

export default async function Image() {
  const t = await getTranslations('metadata')
  const [fontBold, fontSemibold] = await Promise.all([loadGoogleFont(800), loadGoogleFont(600)])

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
        color: '#171717',
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
            color: '#171717',
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
        { name: 'Plus Jakarta Sans', data: fontBold, weight: 800, style: 'normal' },
        { name: 'Plus Jakarta Sans', data: fontSemibold, weight: 600, style: 'normal' },
      ],
    },
  )
}
