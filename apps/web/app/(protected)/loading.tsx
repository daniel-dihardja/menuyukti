import { Skeleton } from '@workspace/ui/components/skeleton'

export default function ProtectedLoading() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 p-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="min-h-[16rem] w-full flex-1 rounded-md" />
      </div>
    </div>
  )
}
