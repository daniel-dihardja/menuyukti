import { CopyrightFooter } from '@/components/copyright-footer'
import { ShopFilterBar, ShopHero, ShopProductGrid } from '@/components/shop'

export default function ShopPage() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 md:px-12">
        <ShopHero />
        <ShopFilterBar />
        <ShopProductGrid />
      </main>
      <CopyrightFooter />
    </div>
  )
}
