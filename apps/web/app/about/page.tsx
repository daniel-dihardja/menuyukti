import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SiteFooter } from '@/components/site-footer'
import { routes } from '@/lib/routes'

const bodyClass = 'text-pretty text-base leading-7 text-foreground'
const sectionTitleClass = 'text-xl font-semibold tracking-tight text-foreground md:text-[1.375rem]'
const emphasisClass = 'text-pretty text-base font-medium leading-7 tracking-tight text-foreground'

function ParagraphStack({
  paragraphs,
  className = bodyClass,
}: {
  paragraphs: ReadonlyArray<ReactNode>
  className?: string
}) {
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={className}>
          {paragraph}
        </p>
      ))}
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about')
  const title = t('metaTitle')
  const description = t('metaDescription')

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: routes.about,
    },
    openGraph: {
      title,
      description,
      url: routes.about,
      siteName: 'Menuyukti',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function AboutPage() {
  const t = await getTranslations('about')

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-light opacity-25" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 landing-atmosphere opacity-50"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-[35rem] flex-1 px-6 py-12 md:py-16">
        <div
          className="pointer-events-none absolute -inset-x-2 inset-y-4 rounded-[1.75rem] bg-background/90 sm:-inset-x-8 sm:inset-y-6"
          aria-hidden
        />
        <article className="relative space-y-12 md:space-y-14">
          <header className="space-y-5">
            <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              {t('title')}
            </h1>
            <ParagraphStack paragraphs={[t('intro'), t('introFollow'), t('introClose')]} />
          </header>

          <section
            className="space-y-5 rounded-2xl border border-primary/20 bg-muted/30 px-4 py-6 sm:px-5"
            aria-labelledby="about-engagement-heading"
          >
            <h2 id="about-engagement-heading" className={sectionTitleClass}>
              {t('engagementTitle')}
            </h2>
            <ParagraphStack
              paragraphs={[
                t('engagementBody'),
                t('engagementBodyFollow'),
                t('engagementBodyClose'),
              ]}
            />
            <p className={emphasisClass}>{t('engagementEmphasis')}</p>
          </section>

          <section className="space-y-4" aria-labelledby="about-setup-heading">
            <h2 id="about-setup-heading" className={sectionTitleClass}>
              {t('setupTitle')}
            </h2>
            <ParagraphStack
              paragraphs={[
                t('setupBody'),
                t('setupBodyFollow'),
                t('setupBodyClose'),
                t('setupDirection'),
              ]}
            />
            <p className={emphasisClass}>{t('setupEmphasis')}</p>
          </section>

          <section className="space-y-4" aria-labelledby="about-ai-heading">
            <div className="flex items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <h2 id="about-ai-heading" className={sectionTitleClass}>
                {t('aiTitle')}
              </h2>
            </div>
            <ParagraphStack
              paragraphs={[t('aiBody'), t('aiBodyFollow'), t('aiBodyClose'), t('aiClosing')]}
            />
          </section>

          <section className="space-y-4" aria-labelledby="about-vision-heading">
            <h2 id="about-vision-heading" className={sectionTitleClass}>
              {t('visionTitle')}
            </h2>
            <ParagraphStack
              paragraphs={[
                t('visionBody'),
                t('visionBodyFollow'),
                t('visionBodyClose'),
                t('visionGoal'),
              ]}
            />
          </section>

          <section
            className="space-y-5 border-t border-border/80 pt-10"
            aria-labelledby="about-closing-heading"
          >
            <h2 id="about-closing-heading" className={sectionTitleClass}>
              {t('closingTitle')}
            </h2>
            <ParagraphStack
              paragraphs={[t('closingBody'), t('closingBodyFollow'), t('closingBodyClose')]}
            />
            <p className={emphasisClass}>{t('closingTagline')}</p>
          </section>
        </article>
      </div>

      <SiteFooter />
    </div>
  )
}
