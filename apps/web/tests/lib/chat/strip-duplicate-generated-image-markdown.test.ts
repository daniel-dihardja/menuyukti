import { describe, expect, it } from 'vitest'

import {
  parseGeneratedImageUrlFromToolOutput,
  stripDuplicateGeneratedImageMarkdown,
} from '@/lib/chat/strip-duplicate-generated-image-markdown'

const URL_A = 'https://bucket.s3.amazonaws.com/users/u/posts/abc.webp?X-Amz-Signature=sig1'
const URL_A_OTHER_QUERY =
  'https://bucket.s3.amazonaws.com/users/u/posts/abc.webp?X-Amz-Signature=other'

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
    const text = '![other](https://cdn.example.com/other.webp)'
    expect(stripDuplicateGeneratedImageMarkdown(text, [URL_A])).toBe(text)
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
