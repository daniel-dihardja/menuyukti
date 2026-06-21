import { clerkClient } from '@clerk/nextjs/server'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  WORKSPACE_MEMBERS_QUERY,
  MY_WORKSPACE_QUERY,
  type MyWorkspaceData,
  type WorkspaceMembersData,
} from '@/lib/graphql/queries'

export type WorkspaceMemberResponse = {
  id: string
  clerkUserId: string
  role: string
  invitedAt: string | null
  acceptedAt: string | null
  email: string | null
  name: string | null
}

export type WorkspaceTeamData = {
  workspace: {
    id: string
    name: string
    ownerClerkUserId: string
  }
  isOwner: boolean
  members: WorkspaceMemberResponse[]
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

export async function getWorkspaceTeamData(userId: string): Promise<WorkspaceTeamData | null> {
  const wsData = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
  const workspace = wsData.myWorkspace ?? null
  if (!workspace) {
    return null
  }

  const membersData = await graphqlQuery<WorkspaceMembersData>(
    WORKSPACE_MEMBERS_QUERY,
    { workspaceId: workspace.id, first: 100 },
    userId,
  )
  const members = await enrichMembers(membersData.workspaceMembers)

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      ownerClerkUserId: workspace.ownerClerkUserId,
    },
    isOwner: workspace.ownerClerkUserId === userId,
    members,
  }
}
