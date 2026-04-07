import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Button } from '@workspace/ui/components/button'
import { CopyrightFooter } from '@/components/copyright-footer'
import { routes } from '@/lib/routes'
import { getTranslations } from 'next-intl/server'
import {
  Upload,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Leaf,
  Sparkles,
  PieChart,
  UtensilsCrossed,
} from 'lucide-react'

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) {
    redirect(routes.dashboard)
  }

  const t = await getTranslations('landing')

  return (
    <div className="relative flex min-h-screen flex-col bg-background pb-24 text-foreground md:pb-0">
      <header className="w-full sticky top-0 z-50  backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">{t('brand')}</h1>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href={routes.shop}
              className="text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              {t('shopLink')}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative w-full min-h-[calc(100vh-4rem)] flex items-center bg-background">
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight max-w-4xl px-3 py-2 mx-auto">
            {t('hero.headline')}
          </h2>

          <p className="mt-4 text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>

          <div className="mt-8 hidden md:flex w-full justify-center">
            <Button size="lg" variant="default" asChild>
              <Link href={routes.login}>{t('hero.ctaPrimary')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-muted">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-1 md:order-2 w-full h-full overflow-hidden shadow-lg">
            <Image
              src="/images/placeholder.svg"
              alt="Menuyukti section image"
              width={1024}
              height={768}
            />
          </div>

          <div className="order-2 md:order-1">
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/90">{t('problem')}</p>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="w-full h-full overflow-hidden shadow-lg">
            <Image
              src="/images/placeholder.svg"
              alt="MenuYukti section image"
              width={1024}
              height={768}
              className="mx-auto"
            />
          </div>

          <div>
            <p className="text-xl md:text-2xl leading-relaxed text-foreground/90">
              {t('solution')}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-muted py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">{t('how.title')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('how.steps.upload.title')}</h3>
              <p className="text-muted-foreground">{t('how.steps.upload.description')}</p>
            </div>

            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <BarChart3 className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('how.steps.analyze.title')}</h3>
              <p className="text-muted-foreground">{t('how.steps.analyze.description')}</p>
            </div>

            <div className="bg-card p-8 text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <Lightbulb className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('how.steps.act.title')}</h3>
              <p className="text-muted-foreground">{t('how.steps.act.description')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">{t('why.title')}</h2>

          <p className="text-center text-foreground/80 max-w-3xl mx-auto mb-16">
            {t('why.subtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-card p-6 shadow-lg text-center">
              <PieChart className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="font-semibold text-lg">{t('why.cards.insights')}</p>
            </div>

            <div className="bg-card p-6 shadow-lg text-center">
              <Leaf className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="font-semibold text-lg">{t('why.cards.waste')}</p>
            </div>

            <div className="bg-card p-6 shadow-lg text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="font-semibold text-lg">{t('why.cards.ops')}</p>
            </div>

            <div className="bg-card p-6 shadow-lg text-center">
              <TrendingUp className="w-10 h-10 text-primary mx-auto mb-4" />
              <p className="font-semibold text-lg">{t('why.cards.margin')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('cta.title')}</h2>

          <p className="text-foreground/80 mb-10 leading-relaxed">{t('cta.description')}</p>

          <Button size="lg" className="px-8 py-6 w-full md:w-auto hidden md:inline-flex" asChild>
            <Link href={routes.login}>{t('cta.primary')}</Link>
          </Button>
        </div>
      </section>

      <CopyrightFooter />

      <div className="fixed bottom-0 left-0 w-full  backdrop-blur-md p-4 flex md:hidden gap-4 z-50">
        <Button className="w-full" size="lg" asChild>
          <Link href={routes.login}>{t('mobileCta.primary')}</Link>
        </Button>
        <Button className="w-full" size="lg" variant="outline">
          {t('mobileCta.secondary')}
        </Button>
      </div>
    </div>
  )
}
