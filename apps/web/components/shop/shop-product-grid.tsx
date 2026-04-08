import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { routes } from '@/lib/routes'
import { listShopImagesForSlug } from '@/lib/shop/s3-shop-images'
import { resolveShopImages } from '@/lib/shop/resolve-shop-images'

import type { ShopProduct } from './shop-catalog'

type Props = {
  products: ShopProduct[]
}

export async function ShopProductGrid({ products }: Props) {
  const t = await getTranslations('shop')

  const rows = await Promise.all(
    products.map(async (p) => {
      const s3 = await listShopImagesForSlug(p.slug)
      const resolved = resolveShopImages(p, s3)
      return { product: p, resolved }
    }),
  )

  const withImages = rows.filter((r) => r.resolved.length > 0)

  if (withImages.length === 0) {
    return (
      <section
        className="mb-32 flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center"
        aria-live="polite"
      >
        <p className="max-w-md text-muted-foreground">{t('noImagesAvailable')}</p>
      </section>
    )
  }

  return (
    <section className="shop-editorial-grid mb-32">
      {withImages.map(({ product: p, resolved }) => {
        const hero = resolved[0]!
        return (
          <Link
            key={p.slug}
            href={routes.shopProduct(p.slug)}
            className={`group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${p.grid.colClass}`}
          >
            <div
              className={`relative mb-6 overflow-hidden rounded-md bg-muted motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.02] ${p.grid.imageAspect}`}
            >
              <Image
                src={hero.src}
                alt={hero.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="min-w-0">
              <h3
                className={`font-[family-name:var(--font-shop-headline)] font-bold text-foreground ${p.grid.titleClass}`}
              >
                {p.title}
              </h3>
              <p
                className={`mt-1 text-muted-foreground ${p.grid.titleClass.includes('text-2xl') ? '' : 'text-sm'}`}
              >
                {p.subtitle}
              </p>
              <p
                className={`mt-3 font-bold uppercase tracking-widest text-muted-foreground transition-opacity group-hover:opacity-80 ${p.grid.addToCartClass}`}
              >
                {t('grid.viewDetails')}
              </p>
            </div>
          </Link>
        )
      })}
    </section>
  )
}
