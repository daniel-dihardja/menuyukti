import { DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import {
  getS3Bucket,
  getS3Client,
  isObjectKeyForIgStory,
  isObjectKeyForPhoto,
  isObjectKeyForPost,
  isObjectKeyForReel,
  isObjectKeyForWorkspaceIgStory,
  isObjectKeyForWorkspacePhoto,
  isObjectKeyForWorkspacePost,
  isObjectKeyForWorkspaceReel,
  isSafeAssetFilename,
  isSafeIgStoryFilename,
  isSafePhotoFilename,
  isSafeReelFilename,
  userIgStoriesObjectKey,
  userIgStoriesPrefix,
  userPhotosObjectKey,
  userPhotosPrefix,
  userPostsObjectKey,
  userPostsPrefix,
  userReelsObjectKey,
  userReelsPrefix,
  workspaceIgStoriesObjectKey,
  workspaceIgStoriesPrefix,
  workspacePhotosObjectKey,
  workspacePhotosPrefix,
  workspacePostsObjectKey,
  workspacePostsPrefix,
  workspaceReelsObjectKey,
  workspaceReelsPrefix,
} from '@/lib/assets/storage'
import { graphqlQuery } from '@/lib/graphql/client'
import { MY_WORKSPACE_QUERY, type MyWorkspaceData } from '@/lib/graphql/queries'

export type MediaKind = 'photos' | 'posts' | 'reels' | 'igstories'
export type MediaAction = 'read' | 'write' | 'delete'

export type WorkspaceMediaAccess = {
  workspaceId: string
  ownerClerkUserId: string
  role: 'owner' | 'member'
  canRead: true
  canWrite: true
  canDelete: true
}

export type WorkspaceMediaAccessResult =
  | { ok: true; access: WorkspaceMediaAccess }
  | { ok: false; response: NextResponse }

export type ListedMediaObject = {
  key: string
  name: string
  size: number
  createdAt: string
}

export async function requireWorkspaceMediaAccess(
  userId: string,
  action: MediaAction = 'read',
): Promise<WorkspaceMediaAccessResult> {
  const wsData = await graphqlQuery<MyWorkspaceData>(MY_WORKSPACE_QUERY, {}, userId)
  const workspace = wsData.myWorkspace
  if (!workspace) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Workspace not found' }, { status: 404 }),
    }
  }

  const role: 'owner' | 'member' = workspace.ownerClerkUserId === userId ? 'owner' : 'member'

  // Both owner and member may read/write/delete workspace media.
  void action

  return {
    ok: true,
    access: {
      workspaceId: workspace.id,
      ownerClerkUserId: workspace.ownerClerkUserId,
      role,
      canRead: true,
      canWrite: true,
      canDelete: true,
    },
  }
}

export function workspaceMediaPrefix(access: WorkspaceMediaAccess, kind: MediaKind): string {
  switch (kind) {
    case 'photos':
      return workspacePhotosPrefix(access.workspaceId)
    case 'posts':
      return workspacePostsPrefix(access.workspaceId)
    case 'reels':
      return workspaceReelsPrefix(access.workspaceId)
    case 'igstories':
      return workspaceIgStoriesPrefix(access.workspaceId)
  }
}

export function legacyOwnerMediaPrefix(access: WorkspaceMediaAccess, kind: MediaKind): string {
  switch (kind) {
    case 'photos':
      return userPhotosPrefix(access.ownerClerkUserId)
    case 'posts':
      return userPostsPrefix(access.ownerClerkUserId)
    case 'reels':
      return userReelsPrefix(access.ownerClerkUserId)
    case 'igstories':
      return userIgStoriesPrefix(access.ownerClerkUserId)
  }
}

export function writeObjectKey(
  access: WorkspaceMediaAccess,
  kind: MediaKind,
  filename: string,
): string {
  switch (kind) {
    case 'photos':
      return workspacePhotosObjectKey(access.workspaceId, filename)
    case 'posts':
      return workspacePostsObjectKey(access.workspaceId, filename)
    case 'reels':
      return workspaceReelsObjectKey(access.workspaceId, filename)
    case 'igstories':
      return workspaceIgStoriesObjectKey(access.workspaceId, filename)
  }
}

function legacyOwnerObjectKey(
  access: WorkspaceMediaAccess,
  kind: MediaKind,
  filename: string,
): string {
  switch (kind) {
    case 'photos':
      return userPhotosObjectKey(access.ownerClerkUserId, filename)
    case 'posts':
      return userPostsObjectKey(access.ownerClerkUserId, filename)
    case 'reels':
      return userReelsObjectKey(access.ownerClerkUserId, filename)
    case 'igstories':
      return userIgStoriesObjectKey(access.ownerClerkUserId, filename)
  }
}

function isSafeFilenameForKind(kind: MediaKind, filename: string): boolean {
  switch (kind) {
    case 'photos':
      return isSafePhotoFilename(filename)
    case 'posts':
      return isSafeAssetFilename(filename)
    case 'reels':
      return isSafeReelFilename(filename)
    case 'igstories':
      return isSafeIgStoryFilename(filename)
  }
}

export function isKeyAllowedForAccess(
  access: WorkspaceMediaAccess,
  kind: MediaKind,
  key: string,
): boolean {
  switch (kind) {
    case 'photos':
      return (
        isObjectKeyForWorkspacePhoto(key, access.workspaceId) ||
        isObjectKeyForPhoto(key, access.ownerClerkUserId)
      )
    case 'posts':
      return (
        isObjectKeyForWorkspacePost(key, access.workspaceId) ||
        isObjectKeyForPost(key, access.ownerClerkUserId)
      )
    case 'reels':
      return (
        isObjectKeyForWorkspaceReel(key, access.workspaceId) ||
        isObjectKeyForReel(key, access.ownerClerkUserId)
      )
    case 'igstories':
      return (
        isObjectKeyForWorkspaceIgStory(key, access.workspaceId) ||
        isObjectKeyForIgStory(key, access.ownerClerkUserId)
      )
  }
}

export function isPostKeyAllowedForAccess(access: WorkspaceMediaAccess, key: string): boolean {
  return isKeyAllowedForAccess(access, 'posts', key)
}

export function isLegacyOwnerPostKey(access: WorkspaceMediaAccess, key: string): boolean {
  return isObjectKeyForPost(key, access.ownerClerkUserId)
}

async function objectExists(key: string): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: getS3Bucket(),
        Key: key,
      }),
    )
    return true
  } catch {
    return false
  }
}

/**
 * Prefer the workspace key; fall back to the legacy owner key when the workspace object is missing.
 */
export async function resolveObjectKey(
  access: WorkspaceMediaAccess,
  kind: MediaKind,
  filename: string,
): Promise<string | null> {
  if (!isSafeFilenameForKind(kind, filename)) return null

  const workspaceKey = writeObjectKey(access, kind, filename)
  if (await objectExists(workspaceKey)) {
    return workspaceKey
  }

  const legacyKey = legacyOwnerObjectKey(access, kind, filename)
  if (await objectExists(legacyKey)) {
    return legacyKey
  }

  return null
}

/**
 * List workspace + legacy owner prefixes, preferring workspace objects when filenames collide.
 */
export async function listWorkspaceMediaObjects(
  access: WorkspaceMediaAccess,
  kind: MediaKind,
  isSafeFilename: (name: string) => boolean,
): Promise<ListedMediaObject[]> {
  const bucket = getS3Bucket()
  const s3 = getS3Client()
  const byName = new Map<string, ListedMediaObject>()

  async function listPrefix(prefix: string, prefer: boolean): Promise<void> {
    let continuationToken: string | undefined
    do {
      const listed = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      )

      for (const obj of listed.Contents ?? []) {
        const key = obj.Key
        if (!key || !obj.LastModified) continue
        if (!isKeyAllowedForAccess(access, kind, key)) continue
        const name = key.slice(prefix.length)
        if (!isSafeFilename(name) || name.includes('/')) continue
        if (!prefer && byName.has(name)) continue
        byName.set(name, {
          key,
          name,
          size: obj.Size ?? 0,
          createdAt: obj.LastModified.toISOString(),
        })
      }

      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
    } while (continuationToken)
  }

  // Legacy first, then workspace overwrites on filename collision.
  await listPrefix(legacyOwnerMediaPrefix(access, kind), false)
  await listPrefix(workspaceMediaPrefix(access, kind), true)

  return [...byName.values()]
}

/** Delete both workspace and legacy owner keys for a filename (idempotent). */
export async function deleteMediaFilename(
  access: WorkspaceMediaAccess,
  kind: MediaKind,
  filename: string,
): Promise<void> {
  if (!isSafeFilenameForKind(kind, filename)) {
    throw new Error('Invalid filename')
  }
  const s3 = getS3Client()
  const bucket = getS3Bucket()
  const keys = [
    writeObjectKey(access, kind, filename),
    legacyOwnerObjectKey(access, kind, filename),
  ]
  await Promise.all(
    keys.map((key) =>
      s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      ),
    ),
  )
}
