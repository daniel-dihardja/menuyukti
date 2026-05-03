import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { routes } from '@/lib/routes'

type Props = {
  workflowId: string
}

export async function ShopWorkflowContextBanner({ workflowId }: Props) {
  const t = await getTranslations('wayfinding.shopFromWorkflow')
  const workflowHref = routes.workflows.detail(workflowId)

  return (
    <div
      className="shop-horizontal-padding-x mx-auto mb-6 w-full max-w-[1440px] rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm"
      role="status"
    >
      <p className="font-medium text-foreground">{t('title')}</p>
      <p className="mt-1 text-muted-foreground">
        <Link
          href={workflowHref}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t('backToWorkflow')}
        </Link>
      </p>
    </div>
  )
}
