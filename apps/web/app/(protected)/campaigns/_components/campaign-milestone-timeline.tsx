'use client'

import 'react-chrono/dist/style.css'

import { Chrono } from 'react-chrono'
import { type CSSProperties, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import styles from './campaign-milestone-timeline.module.css'

const MIN_CARD_WIDTH = 280
/** Minimum timeline height (px); real value comes from ResizeObserver on the host. */
const MIN_TIMELINE_HEIGHT = 160

export function CampaignMilestoneTimeline() {
  const t = useTranslations('analytics.campaigns.chat')
  const chronoHostRef = useRef<HTMLDivElement>(null)
  const [cardWidth, setCardWidth] = useState(450)
  const [timelineHeightPx, setTimelineHeightPx] = useState(200)

  // useLayoutEffect(() => {
  //   const el = chronoHostRef.current
  //   if (!el) return

  //   const measure = () => {
  //     const rect = el.getBoundingClientRect()
  //     if (rect.width > 0) {
  //       setCardWidth(Math.max(MIN_CARD_WIDTH, Math.floor(rect.width)))
  //     }
  //     if (rect.height > 0) {
  //       setTimelineHeightPx(Math.max(MIN_TIMELINE_HEIGHT, Math.floor(rect.height)))
  //     }
  //   }

  //   measure()
  //   const ro = new ResizeObserver(() => {
  //     measure()
  //   })
  //   ro.observe(el)
  //   return () => ro.disconnect()
  // }, [])

  const items = useMemo(
    () => [
      {
        cardTitle: t('milestone2Title'),
        cardSubtitle: t('milestone2Detail'),
        cardDetailedText: [t('milestone2Body1'), t('milestone2Body2')],
      },
      {
        cardTitle: t('milestone1Title'),
        cardSubtitle: t('milestone1Detail'),
        cardDetailedText: [t('milestone1Body1'), t('milestone1Body2')],
      },
    ],
    [t],
  )

  return (
    <div
      className={styles.root}
      style={
        {
          '--campaign-chrono-height': `${timelineHeightPx}px`,
        } as CSSProperties
      }
    >
      <div ref={chronoHostRef} className="border border-red-500 h-full">
        <Chrono
          items={items}
          mode="vertical"
          layout={{
            cardWidth,
            pointSize: 10,
            lineWidth: 2,
            /* layout.timelineHeight is not wired to the inner Timeline in react-chrono 3.3.x — height is set via CSS below. */
            responsive: { enabled: false, breakpoint: 768 },
          }}
          interaction={{
            keyboardNavigation: true,
            pointClick: true,
            autoScroll: false,
          }}
          content={{
            readMore: false,
            alignment: { horizontal: 'stretch', vertical: 'bottom' },
          }}
          display={{
            borderless: true,
            toolbar: { enabled: true, position: 'top', sticky: false },
            scrollable: { scrollbar: true },
          }}
          theme={{
            primary: 'var(--primary)',
            cardBgColor: 'var(--background)',
            cardTitleColor: 'var(--foreground)',
            cardSubtitleColor: 'var(--muted-foreground)',
            cardDetailsColor: 'var(--muted-foreground)',
            detailsColor: 'var(--muted-foreground)',
            titleColor: 'var(--muted-foreground)',
            timelineBgColor: 'var(--background)',
          }}
        />
      </div>
    </div>
  )
}
