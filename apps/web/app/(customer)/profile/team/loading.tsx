import { getTranslations } from 'next-intl/server'

import { CustomerPageShell } from '@/components/customer/customer-page-shell'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function WorkspaceTeamLoading() {
  const t = await getTranslations('workspaceTeam')

  return (
    <CustomerPageShell maxWidth="lg">
      <div className="space-y-6" aria-busy="true" aria-label={t('title')}>
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-32 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    </CustomerPageShell>
  )
}
