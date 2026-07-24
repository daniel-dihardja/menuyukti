'use client'

import type { ReactNode } from 'react'

export type WorkflowChatLayoutProps = {
  chatPane: ReactNode
}

export function WorkflowChatLayout({ chatPane }: WorkflowChatLayoutProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-2xl flex-1 flex-col overflow-hidden">
        {chatPane}
      </div>
    </div>
  )
}
