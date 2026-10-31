import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getSafeAuthReturnPath, buildLoginUrl } from '@/lib/auth-return-path'
import { getAuthenticatedHomePath } from '@/lib/workspace-plan-server'

type SignUpPageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

/**
 * Self-serve sign-up is not offered — `/login` is Google + username/password sign-in only.
 * Keep this route as a redirect so old links and Clerk `signUpUrl` keep working.
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { isAuthenticated, sessionStatus } = await auth()
  if (isAuthenticated && sessionStatus !== 'pending') {
    redirect(await getAuthenticatedHomePath())
  }

  const params = await searchParams
  redirect(buildLoginUrl(getSafeAuthReturnPath(firstParam(params.next))))
}
