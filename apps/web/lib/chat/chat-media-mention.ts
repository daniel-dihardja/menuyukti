export type PendingMediaAttachmentKind = 'photo' | 'post'

/** Pending media-library chip shown in the chat composer. */
export type PendingMediaAttachment = {
  id: string
  kind: PendingMediaAttachmentKind
  name: string
  url: string
  mediaType: string
}

/** Clear an in-progress start-anchored `@` mention trigger without inserting a label. */
export function clearChatMentionTrigger(current: string): string {
  if (current.startsWith('@')) {
    return ''
  }
  return current
}

/** Short display label for UUID-based media filenames. */
export function formatMediaMentionLabel(name: string): string {
  const base = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name
  if (base.length <= 10) return name
  return `${base.slice(0, 8)}…${name.slice(name.lastIndexOf('.'))}`
}

/** MIME type from a media library filename (client-safe; no S3 imports). */
export function mediaTypeFromFilename(name: string): string {
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
      return 'image/webp'
  }
}
