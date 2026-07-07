import { Skeleton } from '@workspace/ui/components/skeleton'

export default function PostDetailLoading() {
  return (
    <div className="flex min-h-[24rem] w-full flex-1 flex-col">
      <Skeleton className="h-full min-h-[24rem] w-full" />
    </div>
  )
}
