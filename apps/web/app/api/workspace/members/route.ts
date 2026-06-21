import { clerkClient } from '@clerk/nextjs/server'
import { auth } from '@clerk/nextjs/server'
import { NextResponse, connection } from 'next/server'

import { apiError, apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  INVITE_WORKSPACE_MEMBER_MUTATION,
  REMOVE_WORKSPACE_MEMBER_MUTATION,
  type InviteWorkspaceMemberData,
  type RemoveWorkspaceMemberData,
} from '@/lib/graphql/queries'
import { getWorkspaceTeamData, type WorkspaceMemberResponse } from '@/lib/workspace/members'

import { inviteWorkspaceMemberSchema, removeWorkspaceMemberSchema } from './schema'

export type { WorkspaceMemberResponse }

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function displayNameFromClerkUser(user: {
  fullName: string | null
  firstName: string | null
  lastName: string | null
  username: string | null
  primaryEmailAddress?: { emailAddress: string } | null
  emailAddresses: Array<{ emailAddress: string }>
}): string | null {
  const full = user.fullName?.trim()
  if (full) return full
  const combined = `${user.firstName?.trim() ?? ''} ${user.lastName?.trim() ?? ''}`.trim()
  if (combined) return combined
  if (user.username) return user.username
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress
  if (email) {
    const local = email.split('@')[0]
    if (local) return local
  }
  return null
}

function primaryEmailFromClerkUser(user: {
  primaryEmailAddress?: { emailAddress: string } | null
  emailAddresses: Array<{ emailAddress: string }>
}): string | null {
  return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
}

function assertWorkspaceOwner(workspace: { ownerClerkUserId: string }, userId: string) {
  if (workspace.ownerClerkUserId !== userId) {
    throw Object.assign(new Error('Only the workspace owner can manage team members'), {
      status: 403,
    })
  }
}

export async function GET() {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const teamData = await getWorkspaceTeamData(userId)
    if (!teamData) {
      return apiError('NOT_FOUND', 'Workspace not found', 404)
    }

    return NextResponse.json(teamData)
  } catch (error) {
    return apiErrorFromUnknown(error, 'Failed to load workspace members')
  }
}

export async function POST(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const teamData = await getWorkspaceTeamData(userId)
    if (!teamData) {
      return apiError('NOT_FOUND', 'Workspace not found', 404)
    }
    assertWorkspaceOwner(teamData.workspace, userId)

    const json = await req.json()
    const { email } = inviteWorkspaceMemberSchema.parse(json)
    const normalizedEmail = normalizeEmail(email)

    const client = await clerkClient()
    const users = await client.users.getUserList({ emailAddress: [normalizedEmail] })
    const invitee = users.data[0]
    if (!invitee) {
      return apiError('INVITE_UNAVAILABLE', 'Invite could not be completed', 400)
    }

    const data = await graphqlQuery<InviteWorkspaceMemberData>(
      INVITE_WORKSPACE_MEMBER_MUTATION,
      { workspaceId: teamData.workspace.id, clerkUserId: invitee.id },
      userId,
    )

    const membership = data.inviteWorkspaceMember
    return NextResponse.json(
      {
        member: {
          id: membership.id,
          clerkUserId: membership.clerkUserId,
          role: membership.role,
          invitedAt: membership.invitedAt,
          acceptedAt: membership.acceptedAt,
          email: primaryEmailFromClerkUser(invitee),
          name: displayNameFromClerkUser(invitee),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 403) {
      return apiError('FORBIDDEN', error.message, 403)
    }
    return apiErrorFromUnknown(error, 'Failed to invite workspace member')
  }
}

export async function DELETE(req: Request) {
  try {
    await connection()
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401)
    }

    const teamData = await getWorkspaceTeamData(userId)
    if (!teamData) {
      return apiError('NOT_FOUND', 'Workspace not found', 404)
    }
    assertWorkspaceOwner(teamData.workspace, userId)

    const json = await req.json()
    const { clerkUserId } = removeWorkspaceMemberSchema.parse(json)

    await graphqlQuery<RemoveWorkspaceMemberData>(
      REMOVE_WORKSPACE_MEMBER_MUTATION,
      { workspaceId: teamData.workspace.id, clerkUserId },
      userId,
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 403) {
      return apiError('FORBIDDEN', error.message, 403)
    }
    return apiErrorFromUnknown(error, 'Failed to remove workspace member')
  }
}
