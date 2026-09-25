'use client'

import { useClerk, useSignIn } from '@clerk/nextjs'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { ChevronDown, Mail } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { GoogleMark } from '@/components/clerk/google-mark'
import { isGoogleOauthAvailable } from '@/components/clerk/is-google-oauth-available'
import { buildAuthContinueUrl, buildLoginUrl, rememberAuthReturnPath } from '@/lib/auth-return-path'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { cn } from '@workspace/ui/lib/utils'

export type GuestSignInMenuProps = {
  className?: string
}

function isSessionExistsError(error: unknown): boolean {
  if (!error) return false
  if (isClerkAPIResponseError(error)) {
    return error.errors.some((e) => e.code === 'session_exists')
  }
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const errors = (error as { errors?: Array<{ code?: string }> }).errors
    return Boolean(errors?.some((e) => e.code === 'session_exists'))
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: string }).code === 'session_exists'
  }
  return false
}

export function GuestSignInMenu({ className }: GuestSignInMenuProps) {
  const tHeader = useTranslations('mainHeader')
  const tLogin = useTranslations('login')
  const pathname = usePathname()
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const googleAvailable = isGoogleOauthAvailable(clerk)
  const [oauthBusy, setOauthBusy] = React.useState(false)
  const [oauthError, setOauthError] = React.useState<string | null>(null)

  const continueUrl = buildAuthContinueUrl(pathname)
  const loginUrl = buildLoginUrl(pathname)

  const goAfterAuth = () => {
    window.location.assign(continueUrl)
  }

  const handleGoogleSignIn = async () => {
    if (oauthBusy) return
    rememberAuthReturnPath(pathname)
    // Already signed in (e.g. OAuth just finished) — don't start another attempt.
    if (clerk.session) {
      goAfterAuth()
      return
    }
    if (!signIn) return
    setOauthBusy(true)
    setOauthError(null)
    try {
      const { error } = await signIn.sso({
        strategy: 'oauth_google',
        redirectUrl: continueUrl,
        redirectCallbackUrl: routes.ssoCallback,
      })
      if (error) {
        if (isSessionExistsError(error) || clerk.session) {
          goAfterAuth()
          return
        }
        setOauthError(tLogin('genericError'))
      }
    } catch (error) {
      if (isSessionExistsError(error) || clerk.session) {
        goAfterAuth()
        return
      }
      setOauthError(tLogin('genericError'))
    } finally {
      setOauthBusy(false)
    }
  }

  return (
    <div className={cn('inline-flex flex-col items-end gap-1', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="gap-1.5"
            aria-label={tHeader('signInMenuTriggerAria')}
            aria-haspopup="menu"
            disabled={oauthBusy}
          >
            {tHeader('mobileMenuSignIn')}
            <ChevronDown className="size-4 opacity-80" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[14rem]">
          {googleAvailable ? (
            <DropdownMenuItem
              disabled={oauthBusy || !signIn}
              onSelect={(event) => {
                event.preventDefault()
                void handleGoogleSignIn()
              }}
            >
              <GoogleMark />
              {oauthBusy ? tLogin('signingInWithGoogle') : tLogin('continueWithGoogle')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild disabled={oauthBusy}>
            <Link href={loginUrl}>
              <Mail className="size-4" aria-hidden />
              {tLogin('continueWithEmail')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {oauthError ? (
        <p className="text-destructive max-w-[14rem] text-right text-xs" role="alert">
          {oauthError}
        </p>
      ) : null}
    </div>
  )
}
