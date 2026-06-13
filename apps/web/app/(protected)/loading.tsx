import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

import {
  APP_INSET_CONTENT_MAX_WIDTH_CLASS,
  ANALYTICS_PAGE_SHELL_PADDING_CLASS,
} from '@/lib/app-layout'

export default function ProtectedLoading() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={cn(
          'mx-auto flex min-h-0 w-full flex-1 flex-col gap-6',
          ANALYTICS_PAGE_SHELL_PADDING_CLASS,
          APP_INSET_CONTENT_MAX_WIDTH_CLASS,
        )}
      >
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="min-h-[16rem] w-full flex-1 rounded-md" />
      </div>
    </div>
  )
}
