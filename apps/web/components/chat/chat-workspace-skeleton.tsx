import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

export function ChatPreviewPanelSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0 rounded-sm" />
          <Skeleton className="h-6 w-3/4 max-w-[12rem]" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 pt-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton className="h-10 w-full rounded-md" key={`preview-accordion-${i}`} />
        ))}
      </div>
    </div>
  )
}

function ChatSidePanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('flex h-full min-h-0 min-w-0 flex-col overflow-hidden', className)}
    >
      <ChatPanelSkeleton className="min-h-0 flex-1" />
    </div>
  )
}

function ChatPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('flex h-full min-h-0 min-w-0 flex-col divide-y overflow-hidden', className)}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <Skeleton className="h-16 w-4/5 max-w-sm rounded-lg" />
        <Skeleton className="ml-auto h-12 w-3/5 max-w-xs rounded-lg" />
        <Skeleton className="h-16 w-4/5 max-w-sm rounded-lg" />
      </div>
      <div className="flex shrink-0 flex-col gap-3 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </div>
      <div className="shrink-0 border-t px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3 sm:pb-4">
        <Skeleton className="h-28 w-full rounded-md" />
      </div>
    </div>
  )
}

export function ChatWorkspaceSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        className,
      )}
    >
      {/* Mobile: chat only */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <ChatSidePanelSkeleton />
        </div>
      </div>

      {/* Desktop: chat + preview split */}
      <div className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="grid h-full min-h-0 flex-1 grid-cols-[1fr_2fr] gap-0 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r">
              <ChatSidePanelSkeleton />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background p-3">
              <ChatPreviewPanelSkeleton className="flex-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
