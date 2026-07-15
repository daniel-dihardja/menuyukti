'use client'

import { useEffect } from 'react'

/** Warns on tab close / refresh when there are unsaved edits. */
export function useUnsavedChangesGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [enabled])
}
