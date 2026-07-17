import { getTranslations } from 'next-intl/server'

const skipLinkClassName =
  'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring'

export async function ProtectedSkipLink() {
  const t = await getTranslations('appShell')

  return (
    <a href="#main-content" className={skipLinkClassName}>
      {t('skipToContent')}
    </a>
  )
}
