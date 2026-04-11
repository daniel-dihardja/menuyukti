'use client'

import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import { Card, CardFooter, CardHeader } from '@workspace/ui/components/card'

import { routes } from '@/lib/routes'

export type ProfileOverviewCardProps = {
  name: string
  email: string
  imageUrl: string | null
  manageAccountLabel: string
  avatarAlt: string
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

export function ProfileOverviewCard({
  name,
  email,
  imageUrl,
  manageAccountLabel,
  avatarAlt,
}: ProfileOverviewCardProps) {
  const initials = initialsFromName(name)

  return (
    <Card className="max-w-md">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <Avatar size="lg" className="size-16 text-lg">
          {imageUrl ? (
            <AvatarImage src={imageUrl} alt={avatarAlt} className="object-cover" />
          ) : null}
          <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">{name}</h2>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </CardHeader>
      <CardFooter className="border-t pt-6">
        <Button asChild className="w-full sm:w-auto">
          <Link href={routes.profileAccount}>{manageAccountLabel}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
