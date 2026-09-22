'use client'

import { useEffect, useRef } from 'react'

import { useSidebar } from '@workspace/ui/components/sidebar'

/** Collapse the app sidebar while the POS cashier is mounted; restore on leave. */
export function PosCollapseSidebar() {
  const { open, setOpen } = useSidebar()
  const previousOpenRef = useRef(open)

  useEffect(() => {
    previousOpenRef.current = open
    setOpen(false)
    return () => {
      setOpen(previousOpenRef.current)
    }
    // Capture open only on mount so we restore the pre-POS sidebar state.
  }, [setOpen]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional mount-only

  return null
}
