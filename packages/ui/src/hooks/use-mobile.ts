import * as React from 'react'

import { DESKTOP_LAYOUT_MIN_WIDTH } from '@workspace/ui/lib/layout-breakpoint'

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${DESKTOP_LAYOUT_MIN_WIDTH - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < DESKTOP_LAYOUT_MIN_WIDTH)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < DESKTOP_LAYOUT_MIN_WIDTH)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}
