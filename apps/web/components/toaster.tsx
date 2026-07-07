'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'touch-manipulation',
        },
      }}
    />
  )
}
