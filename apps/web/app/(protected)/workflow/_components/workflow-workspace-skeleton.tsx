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

function WorkflowChatPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('flex h-full min-h-0 min-w-0 flex-col overflow-hidden', className)}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-6">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <div className="mt-2 flex w-full max-w-md flex-col gap-2">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
      <div className="shrink-0 border-t px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3 sm:pb-4">
        <Skeleton className="h-28 w-full rounded-md" />
      </div>
    </div>
  )
}

export function WorkflowWorkspaceSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        className,
      )}
    >
      <div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-2xl flex-1 flex-col overflow-hidden">
        <WorkflowChatPanelSkeleton className="min-h-0 flex-1" />
      </div>
    </div>
  )
}
