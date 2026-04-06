import { Skeleton } from '@workspace/ui/components/skeleton'

export default function ProtectedLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-48 w-full rounded-md" />
    </div>
  )
}
