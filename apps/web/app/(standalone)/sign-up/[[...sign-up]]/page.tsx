import { MenuyuktiSignUp } from '@/components/clerk/menuyukti-sign-up'
import { getDefaultAuthenticatedPath } from '@/lib/feature-flags'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function SignUpPage() {
  const { isAuthenticated, sessionStatus } = await auth()
  if (isAuthenticated && sessionStatus !== 'pending') {
    redirect(getDefaultAuthenticatedPath())
  }

  const t = await getTranslations('login')

  return (
    <div className="relative flex min-h-[calc(100svh-3.5rem)] w-full flex-col items-center justify-center bg-background p-6">
      <div className="pointer-events-none absolute inset-0 bg-grid-light" aria-hidden />
      <div className="relative mx-auto w-full max-w-md space-y-8">
        <header className="space-y-3 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t('signUpTitle')}
          </h1>
          <p className="landing-hero-subtitle text-lg md:text-xl">{t('slogan')}</p>
          <p className="text-sm text-muted-foreground">{t('signUpDescription')}</p>
        </header>
        <MenuyuktiSignUp />
      </div>
    </div>
  )
}
