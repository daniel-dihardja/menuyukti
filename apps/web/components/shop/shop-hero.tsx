import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

export async function ShopHero() {
  const t = await getTranslations('shop.hero')

  return (
    <section className="relative mb-24 mt-8 overflow-hidden rounded-xl border border-border">
      <div className="relative aspect-[21/9] w-full">
        <Image
          src="/images/pod-hero-02.webp"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1440px) 100vw, 1440px"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/58 via-black/42 to-black/62"
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/72 via-black/48 to-transparent px-8 md:px-16">
          <div className="max-w-2xl text-white">
            <span className="mb-4 block text-sm font-bold uppercase tracking-[0.2em] opacity-90">
              {t('kicker')}
            </span>
            <h1 className="text-balance font-sans text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
              {t('headline')}
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-xl font-light leading-relaxed text-white/95">
              {t('description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
