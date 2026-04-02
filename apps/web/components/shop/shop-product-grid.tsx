import Image from "next/image";
import Link from "next/link";

import { routes } from "@/lib/routes";

import { getAllShopProducts } from "./shop-catalog";

export function ShopProductGrid() {
  const products = getAllShopProducts();

  return (
    <section className="shop-editorial-grid mb-32">
      {products.map((p) => {
        const hero = p.images[0];
        if (!hero) return null;
        return (
          <Link
            key={p.slug}
            href={routes.shopProduct(p.slug)}
            className={`group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#56642b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f6] ${p.grid.colClass}`}
          >
            <div
              className={`mb-6 overflow-hidden rounded-md bg-[#f4f4f0] ${p.grid.imageAspect} relative`}
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
                  className={`font-[family-name:var(--font-shop-headline)] font-bold text-[#2f3430] ${p.grid.titleClass}`}
                >
                  {p.title}
                </h3>
                <p
                  className={`mt-1 text-[#5c605c] ${p.grid.titleClass.includes("text-2xl") ? "" : "text-sm"}`}
                >
                  {p.subtitle}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`font-[family-name:var(--font-shop-headline)] font-bold text-[#56642b] ${p.grid.titleClass.includes("text-2xl") ? "text-xl" : "text-lg"}`}
                >
                  {p.displayPrice}
                </p>
                <p
                  className={`mt-2 font-bold uppercase tracking-widest text-[#934b28] transition-opacity group-hover:opacity-80 ${p.grid.addToCartClass}`}
                >
                  View details
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
