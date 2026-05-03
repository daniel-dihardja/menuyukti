import type { ReactNode } from 'react'
import { cn } from '@workspace/ui/lib/utils'

import { SidebarTriggerClient } from '@/components/sidebar-trigger-client'
import { APP_INSET_CONTENT_MAX_WIDTH_CLASS } from '@/lib/app-layout'

export type AnalyticsPageShellContentWidth = 'full' | 'container'

type Breadcrumb = {
  label: string
  href?: string
}

type AnalyticsPageShellProps = {
  title: string
  breadcrumbs: Breadcrumb[]
  children: ReactNode
  /** Most admin pages: ~1440px centered. Use `full` for studio, campaign workspace, wide charts/tables. @default 'container' */
  contentWidth?: AnalyticsPageShellContentWidth
  mainClassName?: string
  triggerWrapperClassName?: string
  beforeContent?: ReactNode
}

export function AnalyticsPageShell({
  title,
  breadcrumbs,
  children,
  contentWidth = 'container',
  mainClassName,
  triggerWrapperClassName,
  beforeContent,
}: AnalyticsPageShellProps) {
  return (
    <>
      {beforeContent}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {triggerWrapperClassName ? (
          <div className={triggerWrapperClassName}>
            <SidebarTriggerClient title={title} breadcrumbs={breadcrumbs} />
          </div>
        ) : (
          <SidebarTriggerClient title={title} breadcrumbs={breadcrumbs} />
        )}

        <div
          className={cn(
            'mx-auto flex w-full min-h-0 min-w-0 max-w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-6 md:px-12',
            contentWidth === 'container' && APP_INSET_CONTENT_MAX_WIDTH_CLASS,
            mainClassName,
          )}
        >
          {children}
        </div>
      </div>
    </>
  )
}
