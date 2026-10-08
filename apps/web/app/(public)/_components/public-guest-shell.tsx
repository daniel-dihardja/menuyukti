import type { ReactNode } from 'react'

import { cn } from '@workspace/ui/lib/utils'

/** Shared paper wallpaper shell for guest venue surfaces (hub + digital menu). */
export const publicGuestShellClassName =
  "text-foreground min-h-screen bg-[#efeae2] bg-[url('/images/public-menu-wallpaper.svg')] bg-repeat bg-[length:360px_360px]"

type PublicGuestShellProps = {
  children: ReactNode
  className?: string
}

export function PublicGuestShell({ children, className }: PublicGuestShellProps) {
  return <div className={cn(publicGuestShellClassName, className)}>{children}</div>
}

type PublicGuestHeaderProps = {
  children: ReactNode
  headerImageUrl?: string | null
  className?: string
}

/** Full-bleed venue header band with optional cover image + gradient wash. */
export function PublicGuestHeader({ children, headerImageUrl, className }: PublicGuestHeaderProps) {
  const hasHeaderImage = Boolean(headerImageUrl)

  return (
    <header
      className={cn(
        'relative flex min-h-[36vh] flex-col justify-end overflow-hidden px-6 pb-10 pt-16 sm:min-h-[40vh] sm:px-10 sm:pb-12',
        className,
      )}
    >
      {headerImageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
          <img
            src={headerImageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            decoding="async"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
          />
        </>
      ) : null}
      <div
        className={cn(
          'relative z-10 mx-auto w-full max-w-lg',
          hasHeaderImage ? 'text-white' : 'text-foreground',
        )}
      >
        {children}
      </div>
    </header>
  )
}
