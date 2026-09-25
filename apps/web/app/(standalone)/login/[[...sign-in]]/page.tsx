import { MenuyuktiSignIn } from '@/components/clerk/menuyukti-sign-in'
import { RedirectIfSignedIn } from '@/components/clerk/redirect-if-signed-in'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSafeAuthReturnPath } from '@/lib/auth-return-path'
import { getAuthenticatedHomePath } from '@/lib/workspace-plan-server'

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { isAuthenticated, sessionStatus } = await auth()
  const params = await searchParams
  const returnTo = getSafeAuthReturnPath(firstParam(params.next))

  if (isAuthenticated && sessionStatus !== 'pending') {
    redirect(returnTo ?? (await getAuthenticatedHomePath()))
  }

  const t = await getTranslations('login')

  return (
    <div className="relative flex min-h-[calc(100svh-3.5rem)] w-full flex-col items-center justify-center bg-background p-6">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 bg-grid-light" aria-hidden />
      <div className="pointer-events-none absolute inset-0 landing-atmosphere" aria-hidden />
      <div className="relative mx-auto w-full max-w-md space-y-8">
        <header className="space-y-3 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t('title')}
          </h1>
          <p className="landing-hero-subtitle text-lg md:text-xl">{t('slogan')}</p>
        </header>
        <div>
          <Suspense fallback={null}>
            <MenuyuktiSignIn />
          </Suspense>
          <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">
            {t('accessNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
