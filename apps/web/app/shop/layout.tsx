import type { Viewport } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { getTranslations } from 'next-intl/server'
import { connection } from 'next/server'

import { CopyrightFooter } from '@/components/copyright-footer'
import { ShopNav } from '@/components/shop/shop-nav'

import '@/components/shop/shop.css'

import { cn } from '@workspace/ui/lib/utils'

/** Lets `env(safe-area-inset-*)` apply so horizontal padding stays symmetric on notched devices. */
export const viewport: Viewport = {
  viewportFit: 'cover',
}

export default async function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  /** Presigned S3 URLs must not be frozen at build time (Cache Components). */
  await connection()
  const t = await getTranslations('shop')
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  return (
    <div
      className={cn(
        'flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background font-sans text-foreground antialiased',
      )}
    >
      <a
        href="#shop-main"
        className={cn(
          'bg-background text-foreground sr-only z-[100] rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:inline-block focus:ring-2 focus:ring-ring focus:ring-offset-2',
        )}
      >
        {t('skipToContent')}
      </a>
      <ShopNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <CopyrightFooter />
      {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
    </div>
  )
}
