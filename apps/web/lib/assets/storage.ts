import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
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

const ASSET_DESIGNS_SUBDIR = 'designs'

/** S3 prefix: `users/<userId>/designs/`. */
export function userDesignsPrefix(userId: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_DESIGNS_SUBDIR}/`
}

export function userDesignsObjectKey(userId: string, filename: string): string {
  return `${ASSET_USERS_PREFIX}/${userId}/${ASSET_DESIGNS_SUBDIR}/${filename}`
}

/** Allow common image extensions in designs (not restricted to UUID.webp). */
export function isSafeDesignFilename(name: string): boolean {
  return /^[\w\-. ]{1,200}\.(webp|jpg|jpeg|png|gif)$/i.test(name) && !name.includes('/')
}

export function isObjectKeyForDesign(key: string, userId: string): boolean {
  const prefix = userDesignsPrefix(userId)
  if (!key.startsWith(prefix) || key.length <= prefix.length) return false
  const filename = key.slice(prefix.length)
  return isSafeDesignFilename(filename)
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
