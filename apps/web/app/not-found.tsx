import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@workspace/ui/components/button'

export default async function NotFound() {
  const t = await getTranslations('notFound')

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="max-w-md text-muted-foreground text-sm">{t('description')}</p>
      <Button asChild type="button" variant="outline">
        <Link href="/">{t('backToHome')}</Link>
      </Button>
    </div>
  )
}
