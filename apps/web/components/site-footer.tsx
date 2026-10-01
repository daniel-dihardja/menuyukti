import { getTranslations } from 'next-intl/server'

const COPYRIGHT_YEAR = 2026

export async function SiteFooter() {
  const t = await getTranslations('siteFooter')

  return (
    <footer className="mt-auto bg-surface text-foreground">
      <div className="h-px w-full bg-border-strong" aria-hidden />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-5">
        <p className="text-center text-sm tracking-wide text-muted-foreground">
          {t('copyright', { year: COPYRIGHT_YEAR })}
        </p>
      </div>
    </footer>
  )
}
