import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

function TimelineToolbarSkeleton() {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-border/60 border-b bg-card px-2 py-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </header>
  )
}

function MilestoneCardSkeleton({ showMobilePreview }: { showMobilePreview?: boolean }) {
  return (
    <div className="min-w-0 w-full pb-8">
      <div className="flex flex-col overflow-hidden rounded-md bg-card py-4 dark:bg-muted">
        <div className="flex items-center justify-between gap-2 px-3 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className="size-5 shrink-0 rounded-sm" />
            <Skeleton className="h-5 w-36 max-w-[70%]" />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="hidden size-9 rounded-md lg:block" />
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
          </div>
        </div>
        <div className="mt-4 flex gap-2 border-t px-3 pt-4 md:px-6">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton className="h-8 w-16 shrink-0 rounded-md" key={`milestone-tab-${i}`} />
          ))}
        </div>
      </div>
      {showMobilePreview ? <Skeleton className="mt-2 h-10 w-full rounded-lg" /> : null}
    </div>
  )
}

export function ChatTimelineSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-hidden
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background',
        className,
      )}
    >
      <TimelineToolbarSkeleton />
      <div className="min-h-0 flex-1 overflow-hidden px-0 py-2 md:p-4">
        <div className="flex flex-col gap-0">
          <div className="lg:hidden">
            <MilestoneCardSkeleton showMobilePreview />
            <MilestoneCardSkeleton showMobilePreview />
          </div>
          <div className="hidden flex-col lg:flex">
            <MilestoneCardSkeleton />
            <MilestoneCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

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
      {/* Mobile: chat main (milestones column hidden) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <ChatSidePanelSkeleton />
        </div>
      </div>

      {/* Desktop: preview + chat (milestones column hidden) */}
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
