'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

type WorkspaceMember = {
  id: string
  clerkUserId: string
  role: string
  invitedAt: string | null
  acceptedAt: string | null
  email: string | null
  name: string | null
}

type WorkspaceTeamResponse = {
  workspace: {
    id: string
    name: string
    ownerClerkUserId: string
  }
  isOwner: boolean
  members: WorkspaceMember[]
}

type ApiErrorPayload = {
  code?: string
  message?: string
}

function formatInvitedAt(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
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

export function WorkspaceTeamClient() {
  const t = useTranslations('workspaceTeam')
  const [data, setData] = useState<WorkspaceTeamResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/workspace/members')
      const payload = (await res.json().catch(() => null)) as
        | WorkspaceTeamResponse
        | ApiErrorPayload
      if (!res.ok) {
        setLoadError(mapApiErrorToMessage(payload as ApiErrorPayload, t))
        setData(null)
        return
      }
      setData(payload as WorkspaceTeamResponse)
    } catch {
      setLoadError(t('loadError'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data?.isOwner) return

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
      await loadMembers()
    } catch {
      setInviteError(t('errors.generic'))
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(member: WorkspaceMember) {
    if (!data?.isOwner || member.role === 'owner') return

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
      await loadMembers()
    } catch {
      setInviteError(t('errors.generic'))
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>
  }

  if (!data) {
    return <p className="text-sm text-destructive">{t('loadError')}</p>
  }

  return (
    <div className="space-y-6">
      {!data.isOwner ? (
        <p className="text-sm text-muted-foreground">{t('ownerOnlyNotice')}</p>
      ) : null}

      {data.isOwner ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{t('inviteTitle')}</CardTitle>
            <CardDescription>{t('inviteDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('membersTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
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
                {data.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name ?? t('unknownName')}</TableCell>
                    <TableCell>{member.email ?? t('noEmail')}</TableCell>
                    <TableCell>
                      {member.role === 'owner' ? t('roleOwner') : t('roleMember')}
                    </TableCell>
                    <TableCell>{formatInvitedAt(member.invitedAt)}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
