import { clerkClient } from '@clerk/nextjs/server'
import { auth } from '@clerk/nextjs/server'
import { NextResponse, connection } from 'next/server'

import { apiError, apiErrorFromUnknown } from '@/lib/api/error-response'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  INVITE_WORKSPACE_MEMBER_MUTATION,
  MY_WORKSPACE_QUERY,
  REMOVE_WORKSPACE_MEMBER_MUTATION,
  WORKSPACE_MEMBERS_QUERY,
  type InviteWorkspaceMemberData,
  type MyWorkspaceData,
  type RemoveWorkspaceMemberData,
  type WorkspaceMembersData,
} from '@/lib/graphql/queries'

import { inviteWorkspaceMemberSchema, removeWorkspaceMemberSchema } from './schema'

export type WorkspaceMemberResponse = {
  id: string
  clerkUserId: string
  role: string
  invitedAt: string | null
  acceptedAt: string | null
  email: string | null
  name: string | null
}

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

async function getWorkspaceForUser(userId: string) {
  const wsData = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
  return wsData.myWorkspace ?? null
}

async function enrichMembers(
  members: WorkspaceMembersData['workspaceMembers'],
): Promise<WorkspaceMemberResponse[]> {
  const client = await clerkClient()
  return Promise.all(
    members.map(async (member) => {
      try {
        const user = await client.users.getUser(member.clerkUserId)
        return {
          id: member.id,
          clerkUserId: member.clerkUserId,
          role: member.role,
          invitedAt: member.invitedAt,
          acceptedAt: member.acceptedAt,
          email: primaryEmailFromClerkUser(user),
          name: displayNameFromClerkUser(user),
        }
      } catch {
        return {
          id: member.id,
          clerkUserId: member.clerkUserId,
          role: member.role,
          invitedAt: member.invitedAt,
          acceptedAt: member.acceptedAt,
          email: null,
          name: null,
        }
      }
    }),
  )
}

function assertWorkspaceOwner(
  workspace: NonNullable<MyWorkspaceData['myWorkspace']>,
  userId: string,
) {
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

    const workspace = await getWorkspaceForUser(userId)
    if (!workspace) {
      return apiError('NOT_FOUND', 'Workspace not found', 404)
    }

    const membersData = await graphqlQuery<WorkspaceMembersData>(
      WORKSPACE_MEMBERS_QUERY,
      { workspaceId: workspace.id, first: 100 },
      userId,
    )
    const members = await enrichMembers(membersData.workspaceMembers)

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerClerkUserId: workspace.ownerClerkUserId,
      },
      isOwner: workspace.ownerClerkUserId === userId,
      members,
    })
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

    const workspace = await getWorkspaceForUser(userId)
    if (!workspace) {
      return apiError('NOT_FOUND', 'Workspace not found', 404)
    }
    assertWorkspaceOwner(workspace, userId)

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
      { workspaceId: workspace.id, clerkUserId: invitee.id },
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

    const workspace = await getWorkspaceForUser(userId)
    if (!workspace) {
      return apiError('NOT_FOUND', 'Workspace not found', 404)
    }
    assertWorkspaceOwner(workspace, userId)

    const json = await req.json()
    const { clerkUserId } = removeWorkspaceMemberSchema.parse(json)

    await graphqlQuery<RemoveWorkspaceMemberData>(
      REMOVE_WORKSPACE_MEMBER_MUTATION,
      { workspaceId: workspace.id, clerkUserId },
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
