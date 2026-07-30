import { describe, expect, it } from 'vitest'

import type { UIMessage } from 'ai'

import {
  collectGeneratedImageUrlsFromMessages,
  parseGeneratedImageUrlFromToolOutput,
  stripDuplicateGeneratedImageMarkdown,
} from '@/lib/chat/strip-duplicate-generated-image-markdown'

const URL_A = 'https://bucket.s3.amazonaws.com/users/u/posts/abc.webp?X-Amz-Signature=sig1'
const URL_A_OTHER_QUERY =
  'https://bucket.s3.amazonaws.com/users/u/posts/abc.webp?X-Amz-Signature=other'
const URL_B = 'https://cdn.example.com/other.webp'

describe('stripDuplicateGeneratedImageMarkdown', () => {
  it('returns text unchanged when there are no known urls', () => {
    expect(stripDuplicateGeneratedImageMarkdown('Hello ![x](https://a/b.webp)', [])).toBe(
      'Hello ![x](https://a/b.webp)',
    )
  })

  it('strips matching markdown images and keeps narrative', () => {
    const text = `Here is your sun.\n\n![Generated](${URL_A})\n\nEnjoy!`
    expect(stripDuplicateGeneratedImageMarkdown(text, [URL_A])).toBe('Here is your sun.\n\nEnjoy!')
  })

  it('strips bare url lines and html img tags for known urls', () => {
    const text = `Done.\n${URL_A}\n<img src="${URL_A}" alt="x" />\nNice.`
    expect(stripDuplicateGeneratedImageMarkdown(text, [URL_A])).toBe('Done.\n\nNice.')
  })

  it('matches same path with different query strings', () => {
    const text = `![sun](${URL_A_OTHER_QUERY})`
    expect(stripDuplicateGeneratedImageMarkdown(text, [URL_A])).toBe('')
  })

  it('keeps markdown images for unrelated urls', () => {
    const text = `![other](${URL_B})`
    expect(stripDuplicateGeneratedImageMarkdown(text, [URL_A])).toBe(text)
  })

  it('stripAllImageEmbeds removes every markdown and html image', () => {
    const text = `Done.\n\n![a](${URL_B})\n<img src="${URL_B}" alt="x" />\nNice.`
    expect(stripDuplicateGeneratedImageMarkdown(text, [], { stripAllImageEmbeds: true })).toBe(
      'Done.\n\nNice.',
    )
  })
})

describe('collectGeneratedImageUrlsFromMessages', () => {
  it('collects urls across multiple messages', () => {
    const messages = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-generate_instagram_post_image',
            toolCallId: 'c1',
            state: 'output-available',
            input: {},
            output: JSON.stringify({ url: URL_A, name: 'a.webp', mediaS3Key: 'k/a.webp' }),
          },
        ],
      },
      {
        id: 'a2',
        role: 'assistant',
        parts: [{ type: 'text', text: `Here ![x](${URL_A})` }],
      },
    ] as UIMessage[]
    expect(collectGeneratedImageUrlsFromMessages(messages)).toEqual([URL_A])
  })
})

describe('parseGeneratedImageUrlFromToolOutput', () => {
  it('parses url from tool json string', () => {
    expect(
      parseGeneratedImageUrlFromToolOutput(JSON.stringify({ url: URL_A, prompt: 'a sun' })),
    ).toBe(URL_A)
  })

  it('returns null for errors and invalid payloads', () => {
    expect(parseGeneratedImageUrlFromToolOutput('Error: failed')).toBeNull()
    expect(parseGeneratedImageUrlFromToolOutput('{')).toBeNull()
    expect(parseGeneratedImageUrlFromToolOutput('{}')).toBeNull()
  })
})
