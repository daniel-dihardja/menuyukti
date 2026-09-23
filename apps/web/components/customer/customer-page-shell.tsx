import type { ReactNode } from 'react'

import { cn } from '@workspace/ui/lib/utils'

type CustomerPageShellProps = {
  children: ReactNode
  className?: string
  /** Narrower column for home / profile (default). */
  maxWidth?: 'md' | 'lg'
}

const MAX_WIDTH_CLASS = {
  md: 'max-w-lg sm:max-w-2xl',
  lg: 'max-w-3xl',
} as const

/**
 * Light content wrapper for the customer shell (under global `MainHeader`).
 * No sidebar trigger / breadcrumbs — those belong to the operator `AnalyticsPageShell`.
 */
export function CustomerPageShell({
  children,
  className,
  maxWidth = 'md',
}: CustomerPageShellProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <main
        id="main-content"
        className={cn(
          'mx-auto flex w-full min-h-0 min-w-0 flex-1 flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8',
          MAX_WIDTH_CLASS[maxWidth],
          className,
        )}
      >
        {children}
      </main>
    </div>
  )
}
