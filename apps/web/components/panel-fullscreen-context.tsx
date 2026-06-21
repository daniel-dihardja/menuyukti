'use client'

import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react'

import { cn } from '@workspace/ui/lib/utils'

export type PanelFullscreenContextValue = {
  isOpen: boolean
  setContent: (node: ReactNode) => void
  clearContent: () => void
}

const PanelFullscreenContext = createContext<PanelFullscreenContextValue | null>(null)

export type PanelFullscreenProviderProps = {
  children: ReactNode
  className?: string
}

export function PanelFullscreenProvider({ children, className }: PanelFullscreenProviderProps) {
  const [content, setContentState] = useState<ReactNode | null>(null)

  const setContent = useCallback((node: ReactNode) => {
    setContentState(node)
  }, [])

  const clearContent = useCallback(() => {
    setContentState(null)
  }, [])

  const value = useMemo(
    () => ({
      isOpen: content != null,
      setContent,
      clearContent,
    }),
    [clearContent, content, setContent],
  )

  return (
    <PanelFullscreenContext value={value}>
      <div className={cn('relative', className)}>
        {children}
        {content ? (
          <div className="absolute inset-0 z-10 flex min-h-0 flex-col bg-background">{content}</div>
        ) : null}
      </div>
    </PanelFullscreenContext>
  )
}

export function usePanelFullscreen(): PanelFullscreenContextValue | null {
  return use(PanelFullscreenContext)
}
