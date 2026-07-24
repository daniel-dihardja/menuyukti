'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { cn } from '@workspace/ui/lib/utils'

import { withProfileImageParams } from '@/lib/clerk-profile-image'
import { routes } from '@/lib/routes'

const AVATAR_PX = 28

function displayName(user: NonNullable<ReturnType<typeof useUser>['user']>): string {
  const full = user.fullName?.trim()
  if (full) return full
  const first = user.firstName?.trim() ?? ''
  const last = user.lastName?.trim() ?? ''
  const combined = `${first} ${last}`.trim()
  if (combined) return combined
  if (user.username) return user.username
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress
  if (email) {
    const local = email.split('@')[0]
    if (local) return local
  }
  return 'User'
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '?'
}

export type AccountMenuProps = {
  className?: string
}

export function AccountMenu({ className }: AccountMenuProps) {
  const t = useTranslations('accountMenu')
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  if (!isLoaded) {
    return (
      <div
        className={cn('size-8 shrink-0 animate-pulse rounded-full bg-muted', className)}
        aria-hidden
      />
    )
  }

  if (!user) {
    return null
  }

  const name = displayName(user)
  const initials = initialsFromName(name)
  const imageUrl = user.imageUrl ? withProfileImageParams(user.imageUrl, AVATAR_PX) : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('shrink-0 gap-1.5 px-2', className)}
          aria-label={t('triggerAria')}
          aria-haspopup="menu"
        >
          <Avatar size="sm" className="size-7">
            {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <ChevronDown className="size-4 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <div className="border-b px-2 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          {user.primaryEmailAddress?.emailAddress ? (
            <p className="text-muted-foreground truncate text-xs">
              {user.primaryEmailAddress.emailAddress}
            </p>
          ) : null}
        </div>
        <DropdownMenuItem asChild>
          <Link href={routes.profile}>{t('profile')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.profileTeam}>{t('team')}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void signOut({ redirectUrl: routes.login })
          }}
        >
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
