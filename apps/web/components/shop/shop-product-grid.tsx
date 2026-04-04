import Image from 'next/image'
import Link from 'next/link'

import { routes } from '@/lib/routes'

import { getAllShopProducts } from './shop-catalog'

export function ShopProductGrid() {
  const products = getAllShopProducts()

  return (
    <section className="shop-editorial-grid mb-32">
      {products.map((p) => {
        const hero = p.images[0]
        if (!hero) return null
        return (
          <Link
            key={p.slug}
            href={routes.shopProduct(p.slug)}
            className={`group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${p.grid.colClass}`}
          >
            <div
              className={`relative mb-6 overflow-hidden rounded-md bg-muted ${p.grid.imageAspect}`}
            >
              <Image
                src={hero.src}
                alt={hero.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
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
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`font-[family-name:var(--font-shop-headline)] font-bold text-primary ${p.grid.titleClass.includes('text-2xl') ? 'text-xl' : 'text-lg'}`}
                >
                  {p.displayPrice}
                </p>
                <p
                  className={`mt-2 font-bold uppercase tracking-widest text-muted-foreground transition-opacity group-hover:opacity-80 ${p.grid.addToCartClass}`}
                >
                  View details
                </p>
              </div>
            </div>
          </Link>
        )
      })}
    </section>
  )
}
