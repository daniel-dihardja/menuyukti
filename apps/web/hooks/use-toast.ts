import { useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Simple in-memory toast state for now
let toastCount = 0
const listeners: Set<(toast: Toast) => void> = new Set()

export function useToast() {
  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = String(++toastCount)
    const toast: Toast = { ...props, id }
    listeners.forEach((listener) => listener(toast))
  }, [])

  return { toast }
}
