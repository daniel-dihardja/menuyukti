import { parsePostObjectKey } from '@/lib/assets/storage'

/** Extract the filename from a validated post media S3 key, or null if invalid. */
export function parsePostMediaFilename(mediaS3Key: string | null | undefined): string | null {
  if (!mediaS3Key) return null
  return parsePostObjectKey(mediaS3Key)?.filename ?? null
}
