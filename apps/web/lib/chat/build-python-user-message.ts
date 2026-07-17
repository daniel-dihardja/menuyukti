import { createHash } from 'crypto'

import { GetObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import type { UIMessage } from 'ai'

import { CHAT_MAX_IMAGES, CHAT_MAX_IMAGE_BYTES } from '@/lib/chat/chat-image-limits'
import {
  getS3Bucket,
  getS3Client,
  isSafePhotoFilename,
  photoContentTypeForFilename,
  userPhotosObjectKey,
} from '@/lib/assets/storage'

export { CHAT_MAX_IMAGES, CHAT_MAX_IMAGE_BYTES }
/** Longest edge after optional downscale before re-encoding for the LLM. */
const CHAT_IMAGE_MAX_EDGE = 2048

/** MIME types accepted as vision inputs (after optional re-encode). */
const ALLOWED_CHAT_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/** Additional library formats we re-encode to webp before sending to the model. */
const REENCABLE_CHAT_IMAGE_MIMES = new Set(['image/avif', 'image/tiff'])

export type PythonChatTextBlock = { type: 'text'; text: string }
export type PythonChatImageBlock = { type: 'image_url'; image_url: { url: string } }
export type PythonChatContent = string | Array<PythonChatTextBlock | PythonChatImageBlock>

export type PythonChatUserMessage = {
  role: 'user'
  content: PythonChatContent
}

export class ChatImageError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ChatImageError'
    this.status = status
  }
}

function mimeFromDataUrl(dataUrl: string): string | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl)
  return match?.[1]?.toLowerCase() ?? null
}

function bufferFromDataUrl(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) {
    throw new ChatImageError('Invalid image data URL')
  }
  const meta = dataUrl.slice(0, comma)
  if (!meta.includes(';base64')) {
    throw new ChatImageError('Image data URL must be base64-encoded')
  }
  return Buffer.from(dataUrl.slice(comma + 1), 'base64')
}

async function normalizeImageBuffer(
  buffer: Buffer,
  preferredMime: string,
): Promise<{ dataUrl: string; contentHash: string }> {
  const mime = preferredMime.toLowerCase()
  if (!ALLOWED_CHAT_IMAGE_MIMES.has(mime) && !REENCABLE_CHAT_IMAGE_MIMES.has(mime)) {
    throw new ChatImageError(`Unsupported image type: ${mime}`)
  }

  let out = buffer
  let outMime = mime

  try {
    const image = sharp(buffer, { animated: false })
    const meta = await image.metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    const needsResize = width > CHAT_IMAGE_MAX_EDGE || height > CHAT_IMAGE_MAX_EDGE
    const needsReencode =
      REENCABLE_CHAT_IMAGE_MIMES.has(mime) ||
      buffer.byteLength > CHAT_MAX_IMAGE_BYTES ||
      needsResize

    if (needsReencode) {
      let pipeline = image.rotate()
      if (needsResize) {
        pipeline = pipeline.resize({
          width: CHAT_IMAGE_MAX_EDGE,
          height: CHAT_IMAGE_MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
      }
      out = await pipeline.webp({ quality: 82 }).toBuffer()
      outMime = 'image/webp'
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new ChatImageError(`Could not process image: ${detail}`)
  }

  if (out.byteLength > CHAT_MAX_IMAGE_BYTES) {
    throw new ChatImageError(
      `Image exceeds ${CHAT_MAX_IMAGE_BYTES} bytes after compression. Use a smaller image.`,
    )
  }

  const contentHash = createHash('sha256').update(out).digest('hex')
  const dataUrl = `data:${outMime};base64,${out.toString('base64')}`
  return { dataUrl, contentHash }
}

async function loadMediaBytes(
  userId: string,
  name: string,
): Promise<{ buffer: Buffer; mime: string }> {
  if (!isSafePhotoFilename(name)) {
    throw new ChatImageError(`Invalid media filename: ${name}`)
  }
  const key = userPhotosObjectKey(userId, name)
  const s3 = getS3Client()
  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: key,
      }),
    )
    const bytes = await result.Body?.transformToByteArray()
    if (!bytes || bytes.length === 0) {
      throw new ChatImageError(`Media not found: ${name}`, 404)
    }
    const mime =
      (typeof result.ContentType === 'string' && result.ContentType.startsWith('image/')
        ? result.ContentType.toLowerCase()
        : null) ?? photoContentTypeForFilename(name)
    return { buffer: Buffer.from(bytes), mime }
  } catch (err) {
    if (err instanceof ChatImageError) throw err
    const detail = err instanceof Error ? err.message : String(err)
    throw new ChatImageError(`Failed to load media ${name}: ${detail}`, 502)
  }
}

/** Load a user photo from S3 and return a normalized vision data URL. */
export async function loadUserPhotoAsDataUrl(userId: string, name: string): Promise<string> {
  const { buffer, mime } = await loadMediaBytes(userId, name)
  const { dataUrl } = await normalizeImageBuffer(buffer, mime)
  return dataUrl
}

function lastUserMessageParts(messages: UIMessage[]): {
  text: string
  fileDataUrls: string[]
} {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!
    if (m.role !== 'user') continue
    const parts = m.parts ?? []
    const text = parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
    const fileDataUrls: string[] = []
    for (const p of parts) {
      if (p.type !== 'file') continue
      const filePart = p as { type: 'file'; url?: string; mediaType?: string }
      const url = filePart.url
      if (typeof url !== 'string' || !url.startsWith('data:image/')) continue
      const mime = mimeFromDataUrl(url)
      if (!mime || (!ALLOWED_CHAT_IMAGE_MIMES.has(mime) && !REENCABLE_CHAT_IMAGE_MIMES.has(mime))) {
        throw new ChatImageError(`Unsupported attached image type: ${mime ?? 'unknown'}`)
      }
      fileDataUrls.push(url)
    }
    return { text, fileDataUrls }
  }
  return { text: '', fileDataUrls: [] }
}

/**
 * Build the single user message payload for apps/agents POST /chat.
 * Resolves Media library names from S3 and file parts from the UI message into data URLs.
 */
export async function buildPythonUserMessage(args: {
  messages: UIMessage[]
  userId: string
  referencedMediaNames?: string[]
  referenceTextSections?: string[]
}): Promise<PythonChatUserMessage> {
  const { text: rawText, fileDataUrls } = lastUserMessageParts(args.messages)
  const mediaNames = [
    ...new Set((args.referencedMediaNames ?? []).map((n) => n.trim()).filter(Boolean)),
  ]

  if (mediaNames.length > CHAT_MAX_IMAGES) {
    throw new ChatImageError(`At most ${CHAT_MAX_IMAGES} media files can be referenced per message`)
  }

  const imageDataUrls: string[] = []
  const seenHashes = new Set<string>()

  const pushNormalized = async (buffer: Buffer, mime: string) => {
    if (imageDataUrls.length >= CHAT_MAX_IMAGES) {
      throw new ChatImageError(`At most ${CHAT_MAX_IMAGES} images can be attached per message`)
    }
    const { dataUrl, contentHash } = await normalizeImageBuffer(buffer, mime)
    if (seenHashes.has(contentHash)) return
    seenHashes.add(contentHash)
    imageDataUrls.push(dataUrl)
  }

  for (const name of mediaNames) {
    const { buffer, mime } = await loadMediaBytes(args.userId, name)
    await pushNormalized(buffer, mime)
  }

  for (const dataUrl of fileDataUrls) {
    const mime = mimeFromDataUrl(dataUrl)
    if (!mime) {
      throw new ChatImageError('Invalid attached image data URL')
    }
    await pushNormalized(bufferFromDataUrl(dataUrl), mime)
  }

  const sections = (args.referenceTextSections ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const userText = rawText.trim()
  const textParts = [...sections]
  if (userText) textParts.push(userText)
  const combinedText = textParts.join('\n\n')

  if (imageDataUrls.length === 0) {
    if (!combinedText) {
      throw new ChatImageError('No user message with text content found in request')
    }
    return { role: 'user', content: combinedText }
  }

  const blocks: Array<PythonChatTextBlock | PythonChatImageBlock> = []
  if (combinedText) {
    blocks.push({ type: 'text', text: combinedText })
  }
  for (const url of imageDataUrls) {
    blocks.push({ type: 'image_url', image_url: { url } })
  }
  return { role: 'user', content: blocks }
}
