import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'
import { getTranslations } from 'next-intl/server'

export default async function LandingPage() {
  const t = await getTranslations('landing')

  return (
    <div className="relative flex min-w-0 flex-col overflow-x-clip bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('skipToContent')}
      </a>

      <main id="main-content" className="min-w-0 w-full overflow-x-clip">
        <section className="relative w-full min-w-0 overflow-x-clip bg-gradient-to-b from-muted/30 to-background">
          <div
            className={cn(
              'relative mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center',
              'pb-8 pt-8 text-center md:pb-12 md:pt-12',
              'pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
            )}
          >
            <Badge
              variant="secondary"
              className={cn(
                'mb-4 min-w-0 max-w-full whitespace-normal px-3 py-1.5 text-center text-balance leading-snug',
              )}
            >
              {t('hero.badge')}
            </Badge>
            <h1 className="w-full min-w-0 text-balance text-4xl font-bold leading-[1.1] sm:text-5xl md:text-6xl md:leading-[1.08]">
              {t('hero.headline')}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-pretty text-center text-lg leading-relaxed text-foreground/80 md:mt-6 md:text-xl md:leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
