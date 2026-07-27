import { describe, expect, it } from 'vitest'

import {
  isObjectKeyForPost,
  isObjectKeyForUser,
  isObjectKeyForWorkspacePost,
  parsePostObjectKey,
  userPostsObjectKey,
  userPostsPrefix,
  workspacePostsObjectKey,
  workspacePostsPrefix,
} from '@/lib/assets/storage'
import {
  isKeyAllowedForAccess,
  isPostKeyAllowedForAccess,
  writeObjectKey,
  type WorkspaceMediaAccess,
} from '@/lib/assets/workspace-media-access'

const USER_ID = 'user_abc123'
const OWNER_ID = 'owner_xyz'
const WORKSPACE_ID = '42'
const VALID_FILENAME = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'

const access: WorkspaceMediaAccess = {
  workspaceId: WORKSPACE_ID,
  ownerClerkUserId: OWNER_ID,
  role: 'member',
  canRead: true,
  canWrite: true,
  canDelete: true,
}

describe('userPostsPrefix', () => {
  it('returns users/{userId}/posts/', () => {
    expect(userPostsPrefix(USER_ID)).toBe('users/user_abc123/posts/')
  })
})

describe('workspacePostsPrefix', () => {
  it('returns workspaces/{workspaceId}/posts/', () => {
    expect(workspacePostsPrefix(WORKSPACE_ID)).toBe('workspaces/42/posts/')
  })
})

describe('userPostsObjectKey', () => {
  it('returns full S3 key under posts subfolder', () => {
    expect(userPostsObjectKey(USER_ID, VALID_FILENAME)).toBe(
      `users/${USER_ID}/posts/${VALID_FILENAME}`,
    )
  })
})

describe('workspacePostsObjectKey', () => {
  it('returns full S3 key under workspace posts subfolder', () => {
    expect(workspacePostsObjectKey(WORKSPACE_ID, VALID_FILENAME)).toBe(
      `workspaces/${WORKSPACE_ID}/posts/${VALID_FILENAME}`,
    )
  })
})

describe('isObjectKeyForPost', () => {
  it('accepts valid post keys', () => {
    const key = userPostsObjectKey(USER_ID, VALID_FILENAME)
    expect(isObjectKeyForPost(key, USER_ID)).toBe(true)
  })

  it('rejects studio product keys at user root', () => {
    const key = `users/${USER_ID}/${VALID_FILENAME}`
    expect(isObjectKeyForPost(key, USER_ID)).toBe(false)
    expect(isObjectKeyForUser(key, USER_ID)).toBe(true)
  })

  it('rejects keys for other users', () => {
    const key = userPostsObjectKey('other_user', VALID_FILENAME)
    expect(isObjectKeyForPost(key, USER_ID)).toBe(false)
  })

  it('rejects path traversal', () => {
    const key = `users/${USER_ID}/posts/../${VALID_FILENAME}`
    expect(isObjectKeyForPost(key, USER_ID)).toBe(false)
  })

  it('rejects unsafe filenames', () => {
    const key = `users/${USER_ID}/posts/not-a-uuid.webp`
    expect(isObjectKeyForPost(key, USER_ID)).toBe(false)
  })
})

describe('isObjectKeyForWorkspacePost', () => {
  it('accepts valid workspace post keys', () => {
    const key = workspacePostsObjectKey(WORKSPACE_ID, VALID_FILENAME)
    expect(isObjectKeyForWorkspacePost(key, WORKSPACE_ID)).toBe(true)
  })

  it('rejects other workspace keys', () => {
    const key = workspacePostsObjectKey('99', VALID_FILENAME)
    expect(isObjectKeyForWorkspacePost(key, WORKSPACE_ID)).toBe(false)
  })
})

describe('parsePostObjectKey', () => {
  it('parses valid user post keys', () => {
    const key = userPostsObjectKey(USER_ID, VALID_FILENAME)
    expect(parsePostObjectKey(key)).toEqual({
      scope: 'user',
      userId: USER_ID,
      filename: VALID_FILENAME,
    })
  })

  it('parses valid workspace post keys', () => {
    const key = workspacePostsObjectKey(WORKSPACE_ID, VALID_FILENAME)
    expect(parsePostObjectKey(key)).toEqual({
      scope: 'workspace',
      workspaceId: WORKSPACE_ID,
      filename: VALID_FILENAME,
    })
  })

  it('rejects invalid keys', () => {
    expect(parsePostObjectKey(`users/${USER_ID}/${VALID_FILENAME}`)).toBeNull()
    expect(parsePostObjectKey(`users/${USER_ID}/posts/not-a-uuid.webp`)).toBeNull()
  })
})

describe('workspace media access helpers', () => {
  it('writeObjectKey uses workspace posts prefix', () => {
    expect(writeObjectKey(access, 'posts', VALID_FILENAME)).toBe(
      `workspaces/${WORKSPACE_ID}/posts/${VALID_FILENAME}`,
    )
  })

  it('allows workspace and legacy owner keys', () => {
    expect(
      isPostKeyAllowedForAccess(access, workspacePostsObjectKey(WORKSPACE_ID, VALID_FILENAME)),
    ).toBe(true)
    expect(isPostKeyAllowedForAccess(access, userPostsObjectKey(OWNER_ID, VALID_FILENAME))).toBe(
      true,
    )
    expect(isPostKeyAllowedForAccess(access, userPostsObjectKey(USER_ID, VALID_FILENAME))).toBe(
      false,
    )
  })

  it('allows workspace photo keys', () => {
    const key = `workspaces/${WORKSPACE_ID}/photos/${VALID_FILENAME.replace('.webp', '.jpg')}`
    expect(isKeyAllowedForAccess(access, 'photos', key)).toBe(true)
  })
})
