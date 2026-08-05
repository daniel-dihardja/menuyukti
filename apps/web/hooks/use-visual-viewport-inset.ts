'use client'

import { useEffect, useState } from 'react'

import { useCompactLayout } from '@/hooks/use-desktop-layout'

export type VisualViewportInset = {
  /** Pixels occluded at the bottom of the layout viewport (e.g. soft keyboard). */
  bottomInset: number
}

function readBottomInset(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0
  // Distance from visual viewport bottom to layout viewport bottom.
  const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  return Math.round(inset)
}

/**
 * Tracks how much of the layout viewport is covered at the bottom (typically the
 * on-screen keyboard). Returns 0 on desktop / when visualViewport is unavailable.
 */
export function useVisualViewportInset(enabled = true): VisualViewportInset {
  const compact = useCompactLayout()
  const active = enabled && compact
  const [bottomInset, setBottomInset] = useState(0)

  useEffect(() => {
    if (!active) {
      setBottomInset(0)
      return
    }

    const update = () => {
      setBottomInset(readBottomInset())
    }

    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [active])

  return { bottomInset: active ? bottomInset : 0 }
}

/** Pure helper for tests — same formula as the hook's bottom inset. */
export function computeVisualViewportBottomInset(args: {
  innerHeight: number
  visualViewportHeight: number
  visualViewportOffsetTop: number
}): number {
  return Math.max(
    0,
    Math.round(args.innerHeight - args.visualViewportHeight - args.visualViewportOffsetTop),
  )
}
