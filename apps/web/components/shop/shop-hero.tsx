import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

/** Stable seed URL — avoids expiring third-party image links. */
const HERO_SRC = 'https://picsum.photos/seed/menuyukti-shop-hero/2100/900'

export async function ShopHero() {
  const t = await getTranslations('shop.hero')

  return (
    <section className="relative mb-24 mt-8 overflow-hidden rounded-xl">
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        <Image
          src={HERO_SRC}
          alt=""
          fill
          className="object-cover grayscale-[20%]"
          sizes="(max-width: 1440px) 100vw, 1440px"
          priority
        />
      </div>
      <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/40 to-transparent px-8 md:px-16">
        <div className="max-w-2xl text-white">
          <span className="mb-4 block text-sm font-bold uppercase tracking-[0.2em] opacity-80">
            {t('kicker')}
          </span>
          <h1 className="text-balance font-sans text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
            {t('headline')}
          </h1>
          <p className="mt-6 max-w-lg text-pretty text-xl font-light leading-relaxed text-white">
            {t('description')}
          </p>
        </div>
      </div>
    </section>
  )
}
