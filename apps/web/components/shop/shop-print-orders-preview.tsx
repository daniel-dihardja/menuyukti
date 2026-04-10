import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { routes } from '@/lib/routes'
import { resolveShopImages } from '@/lib/shop/resolve-shop-images'
import { listShopImagesForSlug } from '@/lib/shop/s3-shop-images'

import { filterAndSortShopProducts } from './shop-catalog'

const PREVIEW_COUNT = 4

export async function ShopPrintOrdersPreview() {
  const t = await getTranslations('platform.printOrders')
  const products = filterAndSortShopProducts('all', 'popularity').slice(0, PREVIEW_COUNT)

  const rows = await Promise.all(
    products.map(async (p) => {
      const s3 = await listShopImagesForSlug(p.slug)
      const resolved = resolveShopImages(p, s3)
      return { product: p, resolved }
    }),
  )

  const withImages = rows.filter((r) => r.resolved.length > 0)

  if (withImages.length === 0) {
    return null
  }

  return (
    <Card className="mt-8 border-border/80">
      <CardHeader className="gap-1">
        <CardTitle className="text-lg">{t('previewTitle')}</CardTitle>
        <CardDescription>{t('previewDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {withImages.map(({ product: p, resolved }, index) => {
            const hero = resolved[0]!
            return (
              <li key={p.slug}>
                <Link
                  href={routes.shopProduct(p.slug)}
                  className="group block rounded-lg border border-border bg-card p-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-md bg-muted">
                    <Image
                      src={hero.src}
                      alt={hero.alt}
                      fill
                      priority={index === 0}
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.displayPrice}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t('previewFootnote')}</p>
        <Button asChild>
          <Link href={routes.shop}>{t('browseFullCatalog')}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
