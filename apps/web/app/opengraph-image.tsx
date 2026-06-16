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
  const [fontBold, fontSemibold] = await Promise.all([loadGoogleFont(700), loadGoogleFont(600)])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: 'linear-gradient(165deg, #fdf8f2 0%, #f3e8da 55%, #ebe0d2 100%)',
        color: '#2b241c',
        fontFamily: 'Plus Jakarta Sans',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#c17f3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fffaf5',
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          M
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>Menuyukti</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 980 }}>
        <div
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            background: 'rgba(193, 127, 58, 0.14)',
            color: '#8a5a28',
            fontSize: 22,
            fontWeight: 600,
            padding: '10px 20px',
          }}
        >
          {t('ogImageBadge')}
        </div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
          }}
        >
          {t('ogImageHeadline')}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1.45,
            color: 'rgba(43, 36, 28, 0.78)',
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
          color: 'rgba(43, 36, 28, 0.55)',
        }}
      >
        <span>menuyukti.com</span>
        <span>Restaurants · Cafés · Bars</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Plus Jakarta Sans', data: fontBold, weight: 700, style: 'normal' },
        { name: 'Plus Jakarta Sans', data: fontSemibold, weight: 600, style: 'normal' },
      ],
    },
  )
}
