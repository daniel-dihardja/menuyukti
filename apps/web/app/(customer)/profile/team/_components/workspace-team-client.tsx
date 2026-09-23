'use client'

import { useCallback, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { withProfileImageParams } from '@/lib/clerk-profile-image'
import type { WorkspaceTeamData } from '@/lib/workspace/members'

type WorkspaceMember = WorkspaceTeamData['members'][number]

type ApiErrorPayload = {
  code?: string
  message?: string
}

const AVATAR_PX = 28

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

function formatInvitedAt(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

function mapApiErrorToMessage(
  payload: ApiErrorPayload | null,
  t: ReturnType<typeof useTranslations<'workspaceTeam'>>,
): string {
  const message = payload?.message ?? ''
  if (payload?.code === 'INVITE_UNAVAILABLE') {
    return t('errors.inviteUnavailable')
  }
  if (message.toLowerCase().includes('already a member')) {
    return t('errors.alreadyMember')
  }
  if (payload?.code === 'FORBIDDEN' || payload?.code === 'GRAPHQL_FORBIDDEN') {
    return t('errors.forbidden')
  }
  return message || t('errors.generic')
}

type Props = {
  initialData: WorkspaceTeamData
}

export function WorkspaceTeamClient({ initialData }: Props) {
  const t = useTranslations('workspaceTeam')
  const locale = useLocale()
  const [data, setData] = useState<WorkspaceTeamData>(initialData)
  const [email, setEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null)

  const reloadMembers = useCallback(async () => {
    const res = await fetch('/api/workspace/members')
    const payload = (await res.json().catch(() => null)) as WorkspaceTeamData | ApiErrorPayload
    if (res.ok) {
      setData(payload as WorkspaceTeamData)
    }
  }, [])

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data.isOwner) return

    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = (await res.json().catch(() => null)) as
        | { member: WorkspaceMember }
        | ApiErrorPayload
      if (!res.ok) {
        setInviteError(mapApiErrorToMessage(payload as ApiErrorPayload, t))
        return
      }
      setEmail('')
      setInviteSuccess(t('inviteSuccess'))
      await reloadMembers()
    } catch {
      setInviteError(t('errors.generic'))
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(member: WorkspaceMember) {
    if (!data.isOwner || member.role === 'owner') return

    setRemovingId(member.clerkUserId)
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkUserId: member.clerkUserId }),
      })
      const payload = (await res.json().catch(() => null)) as ApiErrorPayload | { ok: true }
      if (!res.ok) {
        setInviteError(mapApiErrorToMessage(payload as ApiErrorPayload, t))
        return
      }
      setMemberToRemove(null)
      await reloadMembers()
    } catch {
      setInviteError(t('errors.generic'))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-10">
      {!data.isOwner ? (
        <p className="text-sm text-muted-foreground">{t('ownerOnlyNotice')}</p>
      ) : null}

      {data.isOwner ? (
        <section className="max-w-xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">{t('inviteTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('inviteDescription')}</p>
          </div>
          <form onSubmit={handleInvite}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="workspace-invite-email">{t('inviteEmailLabel')}</FieldLabel>
                <Input
                  id="workspace-invite-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('inviteEmailPlaceholder')}
                  required
                  disabled={inviting}
                />
              </Field>
              {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
              {inviteSuccess ? (
                <p className="text-sm text-muted-foreground">{inviteSuccess}</p>
              ) : null}
              <Button type="submit" disabled={inviting || email.trim().length === 0}>
                {inviting ? t('inviteSubmitting') : t('inviteSubmit')}
              </Button>
            </FieldGroup>
          </form>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">{t('membersTitle')}</h2>
        {data.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('membersEmpty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tableName')}</TableHead>
                <TableHead>{t('tableEmail')}</TableHead>
                <TableHead>{t('tableRole')}</TableHead>
                <TableHead>{t('tableInvited')}</TableHead>
                {data.isOwner ? (
                  <TableHead className="w-[120px]">{t('tableActions')}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((member) => {
                const displayName = member.name ?? t('unknownName')
                const imageUrl = member.imageUrl
                  ? withProfileImageParams(member.imageUrl, AVATAR_PX)
                  : undefined
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2.5" title={displayName}>
                        <Avatar size="sm" className="size-7">
                          {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
                          <AvatarFallback>{initialsFromName(displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.email ?? t('noEmail')}</TableCell>
                    <TableCell>
                      {member.role === 'owner' ? t('roleOwner') : t('roleMember')}
                    </TableCell>
                    <TableCell>{formatInvitedAt(member.invitedAt, locale)}</TableCell>
                    {data.isOwner ? (
                      <TableCell>
                        {member.role !== 'owner' ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={removingId === member.clerkUserId}
                            onClick={() => setMemberToRemove(member)}
                          >
                            {removingId === member.clerkUserId
                              ? t('removeMemberSubmitting')
                              : t('removeMember')}
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <AlertDialog
        open={memberToRemove != null}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeMemberConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('removeMemberConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('removeMemberCancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={memberToRemove != null && removingId === memberToRemove.clerkUserId}
              onClick={() => {
                if (memberToRemove) void handleRemoveMember(memberToRemove)
              }}
            >
              {memberToRemove && removingId === memberToRemove.clerkUserId
                ? t('removeMemberSubmitting')
                : t('removeMemberConfirmAction')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
