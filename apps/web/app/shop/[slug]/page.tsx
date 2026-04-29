import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { ShopProductDetail } from '@/components/shop/shop-product-detail'
import { getShopProductBySlug } from '@/components/shop/shop-catalog'
import { resolveShopImages } from '@/lib/shop/resolve-shop-images'
import { listShopImagesForSlug } from '@/lib/shop/s3-shop-images'

const getResolvedImagesForSlug = cache(async (slug: string) => {
  const product = getShopProductBySlug(slug)
  if (!product) {
    return { product: null, resolvedImages: [] as ReturnType<typeof resolveShopImages> }
  }

  const s3Images = await listShopImagesForSlug(slug)
  return { product, resolvedImages: resolveShopImages(product, s3Images) }
})

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { product, resolvedImages } = await getResolvedImagesForSlug(slug)
  if (!product) {
    return { title: 'Product | The Digital Curator' }
  }
  const hero = resolvedImages[0]

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
  const { product, resolvedImages } = await getResolvedImagesForSlug(slug)
  if (!product) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col">
      <main
        className="mx-auto w-full max-w-[1440px] flex-1 px-6 pt-8 md:px-12"
        id="shop-main"
        tabIndex={-1}
      >
        <ShopProductDetail key={product.slug} product={product} resolvedImages={resolvedImages} />
      </main>
    </div>
  )
}
