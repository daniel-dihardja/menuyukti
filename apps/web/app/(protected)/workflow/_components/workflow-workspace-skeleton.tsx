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

export function WorkflowTimelineSkeleton({ className }: { className?: string }) {
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

export function WorkflowPreviewPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-dashed bg-card',
        className,
      )}
    >
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

function WorkflowSidePanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('flex h-full min-h-0 min-w-0 flex-col overflow-hidden', className)}
    >
      <div className="flex shrink-0 gap-2 border-b px-2 pt-2">
        <Skeleton className="h-8 w-14 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <WorkflowChatPanelSkeleton className="min-h-0 flex-1" />
    </div>
  )
}

function WorkflowChatPanelSkeleton({ className }: { className?: string }) {
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
      <div className="flex shrink-0 flex-col gap-3 p-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function WorkflowWorkspaceSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn('flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden', className)}
    >
      {/* Mobile: timeline + sticky assistant bar */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:hidden">
        <WorkflowTimelineSkeleton className="min-h-0 flex-1" />
        <div
          aria-hidden
          className="shrink-0 border-t bg-background px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>

      {/* Desktop: three-panel workspace */}
      <div className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="grid h-full min-h-0 flex-1 grid-cols-[38fr_34fr_28fr] gap-0 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r bg-background">
              <WorkflowTimelineSkeleton />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background p-3">
              <WorkflowPreviewPanelSkeleton className="flex-1" />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l">
              <WorkflowSidePanelSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
