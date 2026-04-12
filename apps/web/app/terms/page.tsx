import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { Button } from '@workspace/ui/components/button'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.terms')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: true, follow: true },
  }
}

export default async function TermsPage() {
  const t = await getTranslations('legal.terms')
  const tLogin = await getTranslations('login')

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Button variant="ghost" className="mb-8 -ml-2 gap-2 text-muted-foreground" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden />
            {tLogin('backToHome')}
          </Link>
        </Button>

        <article className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{t('lastUpdated')}</p>
          </header>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('sections.service.title')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">
              {t('sections.service.body')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('sections.account.title')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">
              {t('sections.account.body')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('sections.acceptable.title')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">
              {t('sections.acceptable.body')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('sections.disclaimer.title')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">
              {t('sections.disclaimer.body')}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t('sections.changes.title')}</h2>
            <p className="text-pretty leading-relaxed text-foreground/90">
              {t('sections.changes.body')}
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
