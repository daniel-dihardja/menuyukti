'use client'

import 'react-chrono/dist/style.css'

import { Chrono } from 'react-chrono'
import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react'

import styles from './campaign-milestone-timeline.module.css'

const items = [
  { title: 'May 1940', cardTitle: 'Dunkirk', cardDetailedText: 'Allied evacuation from France' },
  { title: 'July 1940', cardTitle: 'Battle of Britain', cardDetailedText: 'RAF resists Luftwaffe over the UK' },
  { title: 'June 1941', cardTitle: 'Operation Barbarossa', cardDetailedText: 'German invasion of the Soviet Union' },
  { title: 'November 1942', cardTitle: 'Operation Torch', cardDetailedText: 'Allied landings in French North Africa' },
  { title: 'February 1943', cardTitle: 'Stalingrad ends', cardDetailedText: 'German Sixth Army surrenders' },
  { title: 'July 1943', cardTitle: 'Invasion of Sicily', cardDetailedText: 'Allied landings; Mussolini falls' },
  { title: 'June 1944', cardTitle: 'D-Day', cardDetailedText: 'Normandy invasion begins' },
]

const MIN_H = 200

export function CampaignMilestoneTimeline() {
  const measureRef = useRef<HTMLDivElement>(null)
  const [heightPx, setHeightPx] = useState(400)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return

    const measure = () => {
      const h = el.getBoundingClientRect().height
      if (h > 0) setHeightPx(Math.max(MIN_H, Math.floor(h)))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      className={styles.host}
      style={{ '--chrono-h': `${heightPx}px` } as CSSProperties}
    >
      <div ref={measureRef} className={styles.measure}>
        <Chrono
          items={items}
          mode="vertical"
          layout={{
            responsive: { enabled: false, breakpoint: 768 },
          }}
          interaction={{
            keyboardNavigation: true,
            pointClick: true,
            autoScroll: true,
          }}
          content={{
            readMore: false,
            alignment: { horizontal: 'stretch', vertical: 'top' },
          }}
          display={{
            borderless: true,
            toolbar: { enabled: false, position: 'top', sticky: false },
            scrollable: { scrollbar: true },
          }}
        />
      </div>
    </div>
  )
}
