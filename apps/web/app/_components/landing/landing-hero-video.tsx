'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { LANDING_HERO_VIDEO_SRC } from '@/lib/marketing-assets'
import { cn } from '@workspace/ui/lib/utils'

type LandingHeroVideoProps = {
  ariaLabel: string
  className?: string
}

/**
 * Desktop: muted autoplay loop when the user allows motion.
 * Mobile / reduced-motion: no autoplay — preload none, tap controls to play (saves data).
 */
export function LandingHeroVideo({ ariaLabel, className }: LandingHeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldAutoplay, setShouldAutoplay] = useState(false)

  const syncPlayback = useEffectEvent((autoplay: boolean) => {
    const video = videoRef.current
    if (!video) return
    if (autoplay) {
      video.muted = true
      void video.play().catch(() => {})
      return
    }
    video.pause()
    video.currentTime = 0
  })

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const desktopQuery = window.matchMedia('(min-width: 768px)')

    const update = () => {
      const next = !motionQuery.matches && desktopQuery.matches
      setShouldAutoplay(next)
      syncPlayback(next)
    }

    update()
    motionQuery.addEventListener('change', update)
    desktopQuery.addEventListener('change', update)
    return () => {
      motionQuery.removeEventListener('change', update)
      desktopQuery.removeEventListener('change', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncPlayback is useEffectEvent
  }, [])

  return (
    <div
      className={cn(
        'w-full min-w-0 overflow-hidden rounded-lg border border-border-strong bg-surface shadow-[var(--shadow-warm-lg)]',
        className,
      )}
    >
      <video
        ref={videoRef}
        className="aspect-video h-auto w-full object-cover"
        src={LANDING_HERO_VIDEO_SRC}
        aria-label={ariaLabel}
        autoPlay={shouldAutoplay}
        muted
        loop={shouldAutoplay}
        playsInline
        controls
        preload="metadata"
      />
    </div>
  )
}
