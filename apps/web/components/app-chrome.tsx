'use client'

import { usePathname } from 'next/navigation'

import { MainHeader } from '@/components/main-header'

const HIDE_HEADER_PREFIXES = ['/sign-up', '/sso-callback', '/privacy', '/terms']

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideHeader =
    pathname != null &&
    HIDE_HEADER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  return (
    <>
      {!hideHeader ? <MainHeader /> : null}
      {children}
    </>
  )
}
