import { MenuyuktiSignIn } from '@/components/clerk/menuyukti-sign-in'
import { routes } from '@/lib/routes'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const { isAuthenticated, sessionStatus } = await auth()
  if (isAuthenticated && sessionStatus !== 'pending') {
    redirect(routes.workflows.list)
  }

  const t = await getTranslations('login')

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] w-full flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[min(100%,28rem)]">
        <Card className="border shadow-sm">
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-3xl tracking-tight text-foreground md:text-4xl">
              {t('title')}
            </CardTitle>
            <p className="text-lg leading-snug text-foreground/90 md:text-xl">{t('slogan')}</p>
          </CardHeader>
          <CardContent className="pt-2">
            <MenuyuktiSignIn />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
