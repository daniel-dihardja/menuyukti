import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CopyrightFooter } from '@/components/copyright-footer'
import { ShopProductDetail } from '@/components/shop/shop-product-detail'
import { getShopProductBySlug, getShopProductSlugs } from '@/components/shop/shop-catalog'
import { resolveShopImages } from '@/lib/shop/resolve-shop-images'
import { listShopImagesForSlug } from '@/lib/shop/s3-shop-images'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getShopProductSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = getShopProductBySlug(slug)
  if (!product) {
    return { title: 'Product | The Digital Curator' }
  }

  const s3Images = await listShopImagesForSlug(slug)
  const resolved = resolveShopImages(product, s3Images)
  const hero = resolved[0]

  if (!hero) {
    return {
      title: 'Print shop | The Digital Curator',
      description: 'Browse print-on-demand products for restaurants.',
      openGraph: {
        title: 'Print shop',
        description: 'Browse print-on-demand products for restaurants.',
      },
    }
  }

  const description =
    product.description.length > 155 ? `${product.description.slice(0, 152)}…` : product.description

  return {
    title: `${product.title} | The Digital Curator`,
    description,
    openGraph: {
      title: product.title,
      description,
      images: [{ url: hero.src, alt: hero.alt }],
    },
  }
}

export default async function ShopProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = getShopProductBySlug(slug)
  if (!product) {
    notFound()
  }

  const s3Images = await listShopImagesForSlug(slug)
  const resolvedImages = resolveShopImages(product, s3Images)

  return (
    <div className="flex flex-1 flex-col">
      <main
        className="mx-auto w-full max-w-[1440px] flex-1 px-6 pt-8 md:px-12"
        id="shop-main"
        tabIndex={-1}
      >
        <ShopProductDetail key={product.slug} product={product} resolvedImages={resolvedImages} />
      </main>
      <CopyrightFooter />
    </div>
  )
}
