import { CustomerPageShell } from '@/components/customer/customer-page-shell'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { getTranslations } from 'next-intl/server'

export default async function ProfileAccountLoading() {
  const t = await getTranslations('profile')

  return (
    <CustomerPageShell maxWidth="lg">
      <div className="space-y-2" aria-busy="true" aria-label={t('accountTitle')}>
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="pt-2">
          <div className="flex min-h-[24rem] w-full max-w-4xl flex-col gap-4" aria-hidden>
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="min-h-[18rem] w-full flex-1 rounded-lg" />
          </div>
        </div>
      </div>
    </CustomerPageShell>
  )
}
