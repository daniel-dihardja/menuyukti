import {
  ShopFeatured,
  ShopFilterBar,
  ShopFooter,
  ShopHeader,
  ShopHero,
  ShopProductGrid,
} from "@/components/shop";

export default function ShopPage() {
  return (
    <>
      <ShopHeader />
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
