import { getTranslations } from 'next-intl/server'
import { Manrope, Work_Sans } from 'next/font/google'

import { cn } from '@workspace/ui/lib/utils'

import '@/components/shop/shop.css'

/** Presigned S3 URLs must not be frozen at build time. */
export const dynamic = 'force-dynamic'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-shop-headline',
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-shop-body',
})

export default async function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const t = await getTranslations('shop')

  return (
    <div
      className={cn(
        manrope.variable,
        workSans.variable,
        'flex min-h-screen flex-col bg-background font-[family-name:var(--font-shop-body),sans-serif] text-foreground',
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
      {children}
    </div>
  )
}
