import {
  ShopFeatured,
  ShopFilterBar,
  ShopFooter,
  ShopHero,
  ShopProductGrid,
} from "@/components/shop";

export default function ShopPage() {
  return (
    <>
      <main className="mx-auto max-w-[1440px] px-6 md:px-12">
        <ShopHero />
        <ShopFilterBar />
        <ShopProductGrid />
        <ShopFeatured />
      </main>
      <ShopFooter />
    </>
  );
}
