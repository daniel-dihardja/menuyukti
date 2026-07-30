import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import {
  collectAttachedPhotoFilenames,
  hydrateAttachedMediaInMessages,
} from '@/lib/chat/hydrate-attached-media-urls'

const NAME_A = 'f72bd586-2e75-4017-8e23-0db2bb1c3781.png'
const NAME_B = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp'
const URL_A = 'https://cdn.example.com/a.png'
const URL_B = 'https://cdn.example.com/b.webp'

function userMessage(partial: Partial<UIMessage> & { parts: UIMessage['parts'] }): UIMessage {
  return {
    id: partial.id ?? 'u1',
    role: 'user',
    parts: partial.parts,
  }
}

describe('collectAttachedPhotoFilenames', () => {
  it('collects filenames from file parts', () => {
    const messages: UIMessage[] = [
      userMessage({
        parts: [
          { type: 'text', text: 'hello' },
          { type: 'file', filename: NAME_A, mediaType: 'image/png', url: '' },
        ],
      }),
    ]
    expect(collectAttachedPhotoFilenames(messages)).toEqual([NAME_A])
  })

  it('collects filenames from legacy Attached text', () => {
    const messages: UIMessage[] = [
      userMessage({
        parts: [{ type: 'text', text: `Attached: ${NAME_A}, ${NAME_B}\n\nPlease label` }],
      }),
    ]
    expect(collectAttachedPhotoFilenames(messages)).toEqual([NAME_A, NAME_B])
  })

  it('dedupes across messages', () => {
    const messages: UIMessage[] = [
      userMessage({
        id: '1',
        parts: [{ type: 'file', filename: NAME_A, mediaType: 'image/png', url: '' }],
      }),
      userMessage({
        id: '2',
        parts: [{ type: 'text', text: `Attached: ${NAME_A}` }],
      }),
    ]
    expect(collectAttachedPhotoFilenames(messages)).toEqual([NAME_A])
  })
})

describe('hydrateAttachedMediaInMessages', () => {
  it('sets url on existing file parts', () => {
    const messages: UIMessage[] = [
      userMessage({
        parts: [
          { type: 'text', text: 'Please label style' },
          { type: 'file', filename: NAME_A, mediaType: 'image/png', url: '' },
        ],
      }),
    ]
    const next = hydrateAttachedMediaInMessages(messages, { [NAME_A]: URL_A })
    expect(next[0]?.parts).toEqual([
      { type: 'text', text: 'Please label style' },
      { type: 'file', filename: NAME_A, mediaType: 'image/png', url: URL_A },
    ])
  })

  it('converts legacy Attached text into file parts and strips the label', () => {
    const messages: UIMessage[] = [
      userMessage({
        parts: [{ type: 'text', text: `Attached: ${NAME_A}\n\nPlease label style` }],
      }),
    ]
    const next = hydrateAttachedMediaInMessages(messages, { [NAME_A]: URL_A })
    expect(next[0]?.parts).toEqual([
      { type: 'text', text: 'Please label style' },
      {
        type: 'file',
        filename: NAME_A,
        mediaType: 'image/png',
        url: URL_A,
      },
    ])
  })

  it('leaves messages unchanged when url map is empty and no legacy text', () => {
    const messages: UIMessage[] = [
      userMessage({
        parts: [
          { type: 'text', text: 'hi' },
          { type: 'file', filename: NAME_A, mediaType: 'image/png', url: 'https://old' },
        ],
      }),
    ]
    expect(hydrateAttachedMediaInMessages(messages, {})).toBe(messages)
  })

  it('rewrites expired urls from the map', () => {
    const messages: UIMessage[] = [
      userMessage({
        parts: [{ type: 'file', filename: NAME_B, mediaType: 'image/webp', url: 'https://old' }],
      }),
    ]
    const next = hydrateAttachedMediaInMessages(messages, { [NAME_B]: URL_B })
    expect(next[0]?.parts?.[0]).toMatchObject({ url: URL_B, filename: NAME_B })
  })
})
