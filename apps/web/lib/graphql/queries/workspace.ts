export const WORKSPACE_MEMBERS_QUERY = `
  query WorkspaceMembers($workspaceId: ID!, $first: Int) {
    workspaceMembers(workspaceId: $workspaceId, first: $first) {
      id
      workspaceId
      clerkUserId
      role
      invitedAt
      acceptedAt
    }
  }
`

export type WorkspaceMembersData = {
  workspaceMembers: Array<{
    id: string
    workspaceId: string
    clerkUserId: string
    role: string
    invitedAt: string | null
    acceptedAt: string | null
  }>
}

export const INVITE_WORKSPACE_MEMBER_MUTATION = `
  mutation InviteWorkspaceMember($workspaceId: ID!, $clerkUserId: String!) {
    inviteWorkspaceMember(workspaceId: $workspaceId, clerkUserId: $clerkUserId) {
      id
      workspaceId
      clerkUserId
      role
      invitedAt
      acceptedAt
    }
  }
`

export type InviteWorkspaceMemberData = {
  inviteWorkspaceMember: {
    id: string
    workspaceId: string
    clerkUserId: string
    role: string
    invitedAt: string | null
    acceptedAt: string | null
  }
}

export const REMOVE_WORKSPACE_MEMBER_MUTATION = `
  mutation RemoveWorkspaceMember($workspaceId: ID!, $clerkUserId: String!) {
    removeWorkspaceMember(workspaceId: $workspaceId, clerkUserId: $clerkUserId)
  }
`

export type RemoveWorkspaceMemberData = {
  removeWorkspaceMember: boolean
}
