import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function PosLoading() {
  const t = await getTranslations('pos')

  return (
    <div className="flex flex-col gap-4 p-3 lg:p-4" aria-busy="true" aria-label={t('loading')}>
      <Skeleton className="h-8 w-40" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-24 shrink-0" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.9fr)]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="hidden h-96 rounded-lg lg:block" />
      </div>
    </div>
  )
}
