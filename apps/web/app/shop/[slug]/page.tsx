import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CopyrightFooter } from "@/components/copyright-footer";
import { ShopProductDetail } from "@/components/shop/shop-product-detail";
import {
  getShopProductBySlug,
  getShopProductSlugs,
} from "@/components/shop/shop-catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getShopProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getShopProductBySlug(slug);
  if (!product) {
    return { title: "Product | The Digital Curator" };
  }
  const hero = product.images[0];
  const description =
    product.description.length > 155
      ? `${product.description.slice(0, 152)}…`
      : product.description;
  return {
    title: `${product.title} | The Digital Curator`,
    description,
    openGraph: {
      title: product.title,
      description,
      images: hero
        ? [{ url: hero.src, alt: hero.alt }]
        : undefined,
    },
  };
}

export default async function ShopProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getShopProductBySlug(slug);
  if (!product) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 md:px-12 pt-8">
        <ShopProductDetail key={product.slug} product={product} />
      </main>
      <CopyrightFooter />
    </div>
  );
}
