import { describe, expect, it } from 'vitest'

import {
  inviteWorkspaceMemberSchema,
  removeWorkspaceMemberSchema,
} from '@/app/api/workspace/members/schema'

describe('inviteWorkspaceMemberSchema', () => {
  it('accepts a valid email', () => {
    const result = inviteWorkspaceMemberSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    }
  })

  it('trims email whitespace', () => {
    const result = inviteWorkspaceMemberSchema.safeParse({ email: '  user@example.com  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    }
  })

  it('rejects invalid email', () => {
    const result = inviteWorkspaceMemberSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })
})

describe('removeWorkspaceMemberSchema', () => {
  it('accepts a non-empty clerk user id', () => {
    const result = removeWorkspaceMemberSchema.safeParse({ clerkUserId: 'user_123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty clerk user id', () => {
    const result = removeWorkspaceMemberSchema.safeParse({ clerkUserId: '   ' })
    expect(result.success).toBe(false)
  })
})
