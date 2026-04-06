import { Skeleton } from '@workspace/ui/components/skeleton'

export default function CampaignDetailLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[24rem] flex-col gap-4 p-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid flex-1 grid-cols-3 gap-4">
        <Skeleton className="col-span-1 h-full min-h-[12rem] rounded-lg" />
        <Skeleton className="col-span-2 h-full min-h-[12rem] rounded-lg" />
      </div>
    </div>
  )
}
