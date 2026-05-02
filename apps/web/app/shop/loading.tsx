import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function ShopListLoading() {
  const t = await getTranslations('shop')

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <main
        className="shop-horizontal-padding-x mx-auto w-full min-w-0 max-w-[1440px] flex-1"
        id="shop-main"
        tabIndex={-1}
      >
        <section className="relative mb-24 mt-8 overflow-hidden rounded-xl">
          <Skeleton className="aspect-[4/5] w-full rounded-xl sm:aspect-[21/9]" />
        </section>
        <div className="mb-8 flex flex-wrap gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <section className="shop-editorial-grid mb-32">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`shop-grid-skel-${i}`} className="col-span-12 block md:col-span-4">
              <Skeleton className="mb-6 aspect-[3/4] w-full rounded-md" />
              <Skeleton className="h-6 w-4/5 max-w-xs" />
              <Skeleton className="mt-2 h-4 w-3/5 max-w-sm" />
            </div>
          ))}
        </section>
        <p className="sr-only">{t('listPageLoadingTitle')}</p>
      </main>
    </div>
  )
}
