import { describe, expect, it } from 'vitest'

import { parseGeneratedImageToolResult } from '@/lib/chat/parse-generated-image-tool-output'

const VALID = {
  url: 'https://bucket.s3.amazonaws.com/users/u/posts/abc.webp?sig=1',
  name: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp',
  mediaS3Key: 'users/u/posts/a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp',
}

describe('parseGeneratedImageToolResult', () => {
  it('parses url, name, and mediaS3Key from a JSON string', () => {
    expect(parseGeneratedImageToolResult(JSON.stringify(VALID))).toEqual(VALID)
  })

  it('parses from an already-stringified object via JSON.stringify path', () => {
    expect(parseGeneratedImageToolResult(VALID)).toEqual(VALID)
  })

  it('returns null for error strings', () => {
    expect(parseGeneratedImageToolResult('Error: generate failed')).toBeNull()
  })

  it('returns null when name or mediaS3Key is missing', () => {
    expect(parseGeneratedImageToolResult(JSON.stringify({ url: VALID.url }))).toBeNull()
    expect(
      parseGeneratedImageToolResult(JSON.stringify({ url: VALID.url, name: VALID.name })),
    ).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseGeneratedImageToolResult('{')).toBeNull()
  })
})
