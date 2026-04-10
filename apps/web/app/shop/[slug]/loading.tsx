import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function ShopProductLoading() {
  const t = await getTranslations('shop')

  return (
    <div className="flex flex-1 flex-col">
      <main
        className="mx-auto w-full max-w-[1440px] flex-1 px-6 md:px-12"
        id="shop-main"
        tabIndex={-1}
      >
        <div className="mb-24">
          <Skeleton className="mb-10 h-4 w-48 max-w-full" />
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <Skeleton className="aspect-[4/5] w-full rounded-xl sm:aspect-[3/4]" />
              <div className="mt-4 flex gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton className="size-20 shrink-0 rounded-lg" key={`pdp-thumb-skel-${i}`} />
                ))}
              </div>
            </div>
            <div className="space-y-4 lg:col-span-5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-5 w-3/4 max-w-sm" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
        <p className="sr-only">{t('pdp.pageLoadingTitle')}</p>
      </main>
    </div>
  )
}
