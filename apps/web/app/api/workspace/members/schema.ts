import { z } from 'zod'

export const inviteWorkspaceMemberSchema = z.object({
  email: z.string().trim().email(),
})

export const removeWorkspaceMemberSchema = z.object({
  clerkUserId: z.string().trim().min(1),
})

export type InviteWorkspaceMemberInput = z.infer<typeof inviteWorkspaceMemberSchema>
export type RemoveWorkspaceMemberInput = z.infer<typeof removeWorkspaceMemberSchema>
