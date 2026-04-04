import { Manrope, Work_Sans } from 'next/font/google'

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

export const metadata = {
  title: 'The Digital Curator | Art for Your Restaurant',
  description:
    'Elevate your culinary space with bespoke prints designed for the modern restaurateur.',
}

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div
      className={`${manrope.variable} ${workSans.variable} flex min-h-screen flex-col bg-background font-[family-name:var(--font-shop-body),sans-serif] text-foreground`}
    >
      {children}
    </div>
  )
}
