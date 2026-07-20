import { randomUUID } from 'crypto'

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/** Short-lived presigned GET URLs for private bucket objects (list + post-upload display). */
export const PRESIGNED_GET_EXPIRES_SECONDS = 3600

let s3Client: S3Client | null = null

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return v.trim()
}

/** S3 bucket name (default `menuyukti` if unset). */
export function getS3Bucket(): string {
  return process.env.AWS_S3_BUCKET?.trim() || 'menuyukti'
}

export function getS3Region(): string {
  return requireEnv('AWS_REGION')
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: getS3Region() })
  }
  return s3Client
}

/** Top-level segment for per-user asset keys: `users/<userId>/<filename>`. */
const ASSET_USERS_PREFIX = 'users'

export function userPrefix(userId: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/`
}

export function userObjectKey(userId: string, filename: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${filename}`
}

/**
 * Verify that `key` is exactly `users/{userId}/{safe-filename}` (no traversal, no other prefixes).
 */
export function isObjectKeyForUser(key: string, userId: string): boolean {
  const prefix = userPrefix(userId)
  if (!key.startsWith(prefix) || key.length <= prefix.length) return false
  const name = key.slice(prefix.length)
  return !name.includes('/') && isSafeAssetFilename(name)
}

/** Only allow UUID-based `.webp` filenames (no path segments). */
export function isSafeAssetFilename(name: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(name)
}

const PHOTO_FILE_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png', 'gif', 'avif', 'tif', 'tiff'] as const

const SAFE_PHOTO_FILENAME_RE = new RegExp(
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${PHOTO_FILE_EXTENSIONS.join('|')})$`,
  'i',
)

/** UUID-based image filenames for the Photos library (original format preserved on upload). */
export function isSafePhotoFilename(name: string): boolean {
  return SAFE_PHOTO_FILENAME_RE.test(name)
}

const PHOTO_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
}

export function photoExtensionForMime(mime: string): string | null {
  return PHOTO_MIME_TO_EXT[mime.toLowerCase()] ?? null
}

export function photoContentTypeForFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'avif':
      return 'image/avif'
    case 'tif':
    case 'tiff':
      return 'image/tiff'
    default:
      return 'application/octet-stream'
  }
}

const ASSET_PHOTOS_SUBDIR = 'photos'
const ASSET_POSTS_SUBDIR = 'posts'
const ASSET_REELS_SUBDIR = 'reels'
const ASSET_IG_STORIES_SUBDIR = 'igstories'

const UUID_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** S3 prefix: `users/<userId>/photos/`. */
export function userPhotosPrefix(userId: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_PHOTOS_SUBDIR}/`
}

export function userPhotosObjectKey(userId: string, filename: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_PHOTOS_SUBDIR}/${filename}`
}

export function isObjectKeyForPhoto(key: string, userId: string): boolean {
  const prefix = userPhotosPrefix(userId)
  if (!key.startsWith(prefix) || key.length <= prefix.length) return false
  const filename = key.slice(prefix.length)
  return isSafePhotoFilename(filename)
}

/** S3 prefix: `users/<userId>/posts/`. */
export function userPostsPrefix(userId: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_POSTS_SUBDIR}/`
}

export function userPostsObjectKey(userId: string, filename: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_POSTS_SUBDIR}/${filename}`
}

export function isObjectKeyForPost(key: string, userId: string): boolean {
  const prefix = userPostsPrefix(userId)
  if (!key.startsWith(prefix) || key.length <= prefix.length) return false
  const filename = key.slice(prefix.length)
  return isSafeAssetFilename(filename)
}

/** Parse and validate `users/{userId}/posts/{filename}` keys. */
export function parsePostObjectKey(key: string): { userId: string; filename: string } | null {
  const postsMarker = `/${ASSET_POSTS_SUBDIR}/`
  const usersPrefix = `${ASSET_USERS_PREFIX}/`
  if (!key.startsWith(usersPrefix) || !key.includes(postsMarker)) return null

  const userIdEnd = key.indexOf(postsMarker)
  const userId = key.slice(usersPrefix.length, userIdEnd)
  if (!userId || userId.includes('/')) return null
  if (!isObjectKeyForPost(key, userId)) return null

  const filename = key.slice(userIdEnd + postsMarker.length)
  return { userId, filename }
}

/** Delete validated post media objects from S3 (no-op for invalid or missing keys). */
export async function deletePostMediaKeys(
  keys: Iterable<string | null | undefined>,
): Promise<void> {
  const objectKeys = [
    ...new Set(
      [...keys]
        .filter((key): key is string => typeof key === 'string' && key.length > 0)
        .filter((key) => parsePostObjectKey(key) !== null),
    ),
  ]

  if (objectKeys.length === 0) return

  const s3 = getS3Client()
  const bucket = getS3Bucket()

  await Promise.all(
    objectKeys.map((key) =>
      s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      ),
    ),
  )
}

/** S3 prefix: `users/<userId>/reels/`. */
export function userReelsPrefix(userId: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_REELS_SUBDIR}/`
}

export function userReelsObjectKey(userId: string, filename: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_REELS_SUBDIR}/${filename}`
}

/** UUID-based reel filenames: `.webp` (images) or `.mp4` / `.mov` / `.webm` (videos). */
export function isSafeReelFilename(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return false
  const base = name.slice(0, dot)
  const ext = name.slice(dot + 1).toLowerCase()
  if (!UUID_FILENAME.test(base)) return false
  return ext === 'webp' || ext === 'mp4' || ext === 'mov' || ext === 'webm'
}

export function getReelMediaType(filename: string): 'image' | 'video' | null {
  if (!isSafeReelFilename(filename)) return null
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'webp') return 'image'
  if (ext === 'mp4' || ext === 'mov' || ext === 'webm') return 'video'
  return null
}

export function isObjectKeyForReel(key: string, userId: string): boolean {
  const prefix = userReelsPrefix(userId)
  if (!key.startsWith(prefix) || key.length <= prefix.length) return false
  const filename = key.slice(prefix.length)
  return isSafeReelFilename(filename)
}

export function reelContentTypeForFilename(filename: string): string | null {
  if (!isSafeReelFilename(filename)) return null
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'webp':
      return 'image/webp'
    case 'mp4':
      return 'video/mp4'
    case 'mov':
      return 'video/quicktime'
    case 'webm':
      return 'video/webm'
    default:
      return null
  }
}

/** S3 prefix: `users/<userId>/igstories/`. */
export function userIgStoriesPrefix(userId: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_IG_STORIES_SUBDIR}/`
}

export function userIgStoriesObjectKey(userId: string, filename: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_IG_STORIES_SUBDIR}/${filename}`
}

/** UUID-based IG story filenames: `.webp` (images) or `.mp4` / `.mov` / `.webm` (videos). */
export function isSafeIgStoryFilename(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return false
  const base = name.slice(0, dot)
  const ext = name.slice(dot + 1).toLowerCase()
  if (!UUID_FILENAME.test(base)) return false
  return ext === 'webp' || ext === 'mp4' || ext === 'mov' || ext === 'webm'
}

export function getIgStoryMediaType(filename: string): 'image' | 'video' | null {
  if (!isSafeIgStoryFilename(filename)) return null
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'webp') return 'image'
  if (ext === 'mp4' || ext === 'mov' || ext === 'webm') return 'video'
  return null
}

export function isObjectKeyForIgStory(key: string, userId: string): boolean {
  const prefix = userIgStoriesPrefix(userId)
  if (!key.startsWith(prefix) || key.length <= prefix.length) return false
  const filename = key.slice(prefix.length)
  return isSafeIgStoryFilename(filename)
}

export function igStoryContentTypeForFilename(filename: string): string | null {
  if (!isSafeIgStoryFilename(filename)) return null
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'webp':
      return 'image/webp'
    case 'mp4':
      return 'video/mp4'
    case 'mov':
      return 'video/quicktime'
    case 'webm':
      return 'video/webm'
    default:
      return null
  }
}

/** Copy a post media object to a new UUID-based key for the same user. */
export async function copyPostMediaKey(sourceKey: string, userId: string): Promise<string> {
  if (!isObjectKeyForPost(sourceKey, userId)) {
    throw new Error('Invalid source post media key')
  }

  const filename = `${randomUUID()}.webp`
  const destinationKey = userPostsObjectKey(userId, filename)
  const s3 = getS3Client()
  const bucket = getS3Bucket()

  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${sourceKey}`,
        Key: destinationKey,
        ContentType: 'image/webp',
      }),
    )
    return destinationKey
  } catch {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
      }),
    )
    const bytes = await result.Body?.transformToByteArray()
    if (!bytes) {
      throw new Error('Source post media not found')
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: destinationKey,
        Body: Buffer.from(bytes),
        ContentType: 'image/webp',
      }),
    )
    return destinationKey
  }
}

export async function getPresignedGetUrl(objectKey: string): Promise<string> {
  const client = getS3Client()
  const command = new GetObjectCommand({
    Bucket: getS3Bucket(),
    Key: objectKey,
  })
  return getSignedUrl(client, command, { expiresIn: PRESIGNED_GET_EXPIRES_SECONDS })
}

/** Presigned GET that suggests a download filename (Content-Disposition: attachment). */
export async function getPresignedAttachmentUrl(
  objectKey: string,
  downloadFilename: string,
): Promise<string> {
  const client = getS3Client()
  const safeName = downloadFilename.replace(/[^\w.-]+/g, '_') || 'download'
  const command = new GetObjectCommand({
    Bucket: getS3Bucket(),
    Key: objectKey,
    ResponseContentDisposition: `attachment; filename="${safeName}"`,
  })
  return getSignedUrl(client, command, { expiresIn: PRESIGNED_GET_EXPIRES_SECONDS })
}
