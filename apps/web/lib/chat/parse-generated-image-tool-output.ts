/** Parsed successful `generate_instagram_post_image` tool output. */
export type GeneratedImageToolResult = {
  url: string
  name: string
  mediaS3Key: string
}

/**
 * Parse url + name + mediaS3Key from generate_instagram_post_image tool output
 * (JSON object or stringified JSON). Returns null for errors / incomplete payloads.
 */
export function parseGeneratedImageToolResult(output: unknown): GeneratedImageToolResult | null {
  const raw = typeof output === 'string' ? output : output != null ? JSON.stringify(output) : ''
  if (!raw || raw.startsWith('Error')) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    const record = parsed as Record<string, unknown>
    const url = record.url
    const name = record.name
    const mediaS3Key = record.mediaS3Key
    if (
      typeof url !== 'string' ||
      !url ||
      typeof name !== 'string' ||
      !name ||
      typeof mediaS3Key !== 'string' ||
      !mediaS3Key
    ) {
      return null
    }
    return { url, name, mediaS3Key }
  } catch {
    return null
  }
}
