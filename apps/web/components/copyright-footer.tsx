import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { CookiePreferencesButton } from '@/components/cookie-consent/cookie-preferences-button'
import { routes } from '@/lib/routes'

const linkClassName =
  'text-muted-foreground underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export async function CopyrightFooter() {
  const t = await getTranslations('shop.footer')
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-card pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="shop-horizontal-padding-x mx-auto flex max-w-6xl flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:justify-center sm:gap-6">
        <p className="text-center">
          © <span suppressHydrationWarning>{year}</span> Menuyukti
        </p>
        <Link href={routes.privacy} className={linkClassName}>
          {t('privacy')}
        </Link>
        <CookiePreferencesButton className={linkClassName} />
      </div>
    </footer>
  )
}
