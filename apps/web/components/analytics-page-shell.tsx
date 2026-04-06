import type { ReactNode } from 'react'
import { SidebarInset } from '@workspace/ui/components/sidebar'
import { cn } from '@workspace/ui/lib/utils'
import { SidebarTriggerClient } from '@/components/sidebar-trigger-client'

type Breadcrumb = {
  label: string
  href?: string
}

type AnalyticsPageShellProps = {
  title: string
  breadcrumbs: Breadcrumb[]
  children: ReactNode
  mainClassName?: string
  triggerWrapperClassName?: string
  beforeContent?: ReactNode
}

export function AnalyticsPageShell({
  title,
  breadcrumbs,
  children,
  mainClassName,
  triggerWrapperClassName,
  beforeContent,
}: AnalyticsPageShellProps) {
  return (
    <SidebarInset className="min-h-0">
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
            'mx-auto flex w-full max-w-6xl flex-1 flex-col min-h-0 p-4 space-y-6',
            mainClassName,
          )}
        >
          {children}
        </div>
      </div>
    </SidebarInset>
  )
}
