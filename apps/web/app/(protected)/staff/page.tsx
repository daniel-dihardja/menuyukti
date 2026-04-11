import { getTranslations } from 'next-intl/server'

import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export default async function StaffPage() {
  await requireMenuyuktiAdmin()

  const t = await getTranslations('staff')

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground text-sm">{t('description')}</p>
    </div>
  )
}
