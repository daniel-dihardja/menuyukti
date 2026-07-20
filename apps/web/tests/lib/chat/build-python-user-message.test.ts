import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import { buildPythonUserMessage, ChatImageError } from '@/lib/chat/build-python-user-message'

/** 1x1 PNG */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`

function userMessage(parts: UIMessage['parts']): UIMessage[] {
  return [
    {
      id: '1',
      role: 'user',
      parts,
    },
  ]
}

describe('buildPythonUserMessage', () => {
  it('returns plain text when there are no images', async () => {
    const result = await buildPythonUserMessage({
      messages: userMessage([{ type: 'text', text: 'Hello' }]),
      userId: 'user-1',
    })
    expect(result).toEqual({ role: 'user', content: 'Hello' })
  })

  it('builds multimodal blocks from file data URLs', async () => {
    const result = await buildPythonUserMessage({
      messages: userMessage([
        { type: 'text', text: 'Describe this' },
        {
          type: 'file',
          mediaType: 'image/png',
          url: TINY_PNG_DATA_URL,
          filename: 'tiny.png',
        },
      ]),
      userId: 'user-1',
    })
    expect(result.role).toBe('user')
    expect(Array.isArray(result.content)).toBe(true)
    const blocks = result.content as Array<{
      type: string
      text?: string
      image_url?: { url: string }
    }>
    expect(blocks[0]).toEqual({ type: 'text', text: 'Describe this' })
    expect(blocks[1]?.type).toBe('image_url')
    expect(blocks[1]?.image_url?.url.startsWith('data:image/')).toBe(true)
  })

  it('prepends reference sections to text', async () => {
    const result = await buildPythonUserMessage({
      messages: userMessage([{ type: 'text', text: 'Question' }]),
      userId: 'user-1',
      referenceTextSections: ['## Preset\nfoo'],
    })
    expect(result.content).toBe('## Preset\nfoo\n\nQuestion')
  })

  it('throws when there is neither text nor images', async () => {
    await expect(
      buildPythonUserMessage({
        messages: userMessage([]),
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(ChatImageError)
  })

  it('ignores https file parts (library picks use referencedMediaNames)', async () => {
    const result = await buildPythonUserMessage({
      messages: userMessage([
        { type: 'text', text: 'Hi' },
        {
          type: 'file',
          mediaType: 'image/webp',
          url: 'https://example.com/photo.webp',
          filename: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp',
        },
      ]),
      userId: 'user-1',
    })
    expect(result).toEqual({ role: 'user', content: 'Hi' })
  })

  it('rejects combined media and post references over the image limit', async () => {
    const names = [
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee0.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee2.webp',
    ]
    await expect(
      buildPythonUserMessage({
        messages: userMessage([{ type: 'text', text: 'Hi' }]),
        userId: 'user-1',
        referencedMediaNames: names,
        referencedPostMediaNames: [
          'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee3.webp',
          'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee4.webp',
        ],
      }),
    ).rejects.toBeInstanceOf(ChatImageError)
  })

  it('rejects invalid post media filenames before S3', async () => {
    await expect(
      buildPythonUserMessage({
        messages: userMessage([{ type: 'text', text: 'Hi' }]),
        userId: 'user-1',
        referencedPostMediaNames: ['../secret.webp'],
      }),
    ).rejects.toBeInstanceOf(ChatImageError)
  })
})
