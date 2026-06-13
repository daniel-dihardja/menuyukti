import type { ReactNode } from 'react'
import { cn } from '@workspace/ui/lib/utils'

import { SidebarTriggerClient } from '@/components/sidebar-trigger-client'
import {
  APP_INSET_CONTENT_MAX_WIDTH_CLASS,
  ANALYTICS_PAGE_SHELL_PADDING_CLASS,
} from '@/lib/app-layout'

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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className={cn('shrink-0', triggerWrapperClassName)}>
          <SidebarTriggerClient title={title} breadcrumbs={breadcrumbs} />
        </header>

        <div
          className={cn(
            'mx-auto flex w-full min-h-0 min-w-0 max-w-full flex-1 flex-col gap-6 overflow-y-auto',
            ANALYTICS_PAGE_SHELL_PADDING_CLASS,
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
