import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'

import {
  applyPresignedUrlsToMessages,
  collectGeneratedImageMediaS3Keys,
  normalizeGeneratedImageToolOutputsInMessages,
} from '@/lib/chat/refresh-generated-image-urls'

const KEY_A = 'workspaces/ws/posts/a.webp'
const KEY_B = 'workspaces/ws/posts/b.webp'
const URL_A = 'https://cdn.example.com/a.webp?sig=old'
const URL_B = 'https://cdn.example.com/b.webp?sig=old'
const URL_A_FRESH = 'https://cdn.example.com/a.webp?sig=new'

function assistantWithGenerateOutput(
  output: unknown,
  opts?: { asString?: boolean; id?: string },
): UIMessage {
  const body = opts?.asString ? JSON.stringify(output) : output
  return {
    id: opts?.id ?? 'a1',
    role: 'assistant',
    parts: [
      {
        type: 'tool-generate_instagram_post_image',
        toolCallId: 'call-1',
        state: 'output-available',
        input: { prompt: 'x' },
        output: body,
      },
    ],
  } as UIMessage
}

describe('normalizeGeneratedImageToolOutputsInMessages', () => {
  it('keeps mediaS3Key and preserves extra fields', () => {
    const messages = [
      assistantWithGenerateOutput(
        {
          url: URL_A,
          name: 'a.webp',
          mediaS3Key: KEY_A,
          action: 'save_result',
          story_assets: [{ role: 'result', name: 'a.webp', note: '' }],
        },
        { asString: true },
      ),
    ]
    const next = normalizeGeneratedImageToolOutputsInMessages(messages)
    const output = next[0]?.parts?.[0] as { output?: string }
    const parsed = JSON.parse(output.output ?? '{}') as Record<string, unknown>
    expect(parsed.mediaS3Key).toBe(KEY_A)
    expect(parsed.url).toBe(URL_A)
    expect(parsed.name).toBe('a.webp')
    expect(parsed.action).toBe('save_result')
    expect(parsed.story_assets).toEqual([{ role: 'result', name: 'a.webp', note: '' }])
  })

  it('leaves error outputs unchanged', () => {
    const messages = [assistantWithGenerateOutput('Error: generate failed', { asString: false })]
    expect(normalizeGeneratedImageToolOutputsInMessages(messages)).toEqual(messages)
  })
})

describe('collectGeneratedImageMediaS3Keys', () => {
  it('returns unique keys in encounter order', () => {
    const messages = [
      assistantWithGenerateOutput({ url: URL_A, name: 'a.webp', mediaS3Key: KEY_A }, { id: '1' }),
      assistantWithGenerateOutput({ url: URL_B, name: 'b.webp', mediaS3Key: KEY_B }, { id: '2' }),
      assistantWithGenerateOutput({ url: URL_A, name: 'a.webp', mediaS3Key: KEY_A }, { id: '3' }),
    ]
    expect(collectGeneratedImageMediaS3Keys(messages)).toEqual([KEY_A, KEY_B])
  })
})

describe('applyPresignedUrlsToMessages', () => {
  it('rewrites string and object tool outputs for known keys', () => {
    const messages = [
      assistantWithGenerateOutput(
        { url: URL_A, name: 'a.webp', mediaS3Key: KEY_A },
        { asString: true, id: '1' },
      ),
      assistantWithGenerateOutput(
        { url: URL_B, name: 'b.webp', mediaS3Key: KEY_B },
        { asString: false, id: '2' },
      ),
    ]
    const next = applyPresignedUrlsToMessages(messages, { [KEY_A]: URL_A_FRESH })
    const part1 = next[0]?.parts?.[0] as { output?: string }
    const part2 = next[1]?.parts?.[0] as { output?: { url?: string; mediaS3Key?: string } }
    expect(JSON.parse(part1.output ?? '{}')).toMatchObject({
      url: URL_A_FRESH,
      mediaS3Key: KEY_A,
      name: 'a.webp',
    })
    expect(part2.output).toMatchObject({ url: URL_B, mediaS3Key: KEY_B })
  })

  it('leaves unknown keys unchanged', () => {
    const messages = [
      assistantWithGenerateOutput({ url: URL_A, name: 'a.webp', mediaS3Key: KEY_A }),
    ]
    expect(applyPresignedUrlsToMessages(messages, { [KEY_B]: URL_A_FRESH })).toEqual(messages)
  })
})
