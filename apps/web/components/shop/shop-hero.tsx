import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

export async function ShopHero() {
  const t = await getTranslations('shop.hero')

  return (
    <section className="relative mb-24 mt-8 w-full min-w-0 overflow-hidden rounded-xl border border-border">
      <div className="relative aspect-[4/5] w-full min-w-0 sm:aspect-[21/9]">
        <Image
          src="/images/pod-hero-02.webp"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1440px) 100vw, 1440px"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/58 via-black/42 to-black/62"
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/72 via-black/48 to-transparent px-4 sm:px-8 md:px-16">
          <div className="max-w-2xl text-white">
            <span className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] opacity-90 sm:mb-4 sm:text-sm">
              {t('kicker')}
            </span>
            <h1 className="text-balance font-sans text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-7xl">
              {t('headline')}
            </h1>
            <p className="mt-4 max-w-lg text-pretty text-base font-light leading-relaxed text-white/95 sm:mt-6 sm:text-xl">
              {t('description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
