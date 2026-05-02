import { getTranslations } from 'next-intl/server'

export async function ShopHero() {
  const t = await getTranslations('shop.hero')

  return (
    <section className="relative mb-24 mt-8 overflow-hidden rounded-xl border border-border bg-muted">
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-muted" />
      <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/55 via-black/35 to-transparent px-8 md:px-16">
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
    </section>
  )
}
