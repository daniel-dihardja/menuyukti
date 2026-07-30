import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'

import { latestGeneratedImageUrlFromMessages } from '@/lib/chat/latest-generated-image-url'

const URL_A = 'https://cdn.example.com/a.webp'
const URL_B = 'https://cdn.example.com/b.webp'

function assistantWithGenerateOutput(url: string): UIMessage {
  return {
    id: `m-${url}`,
    role: 'assistant',
    parts: [
      {
        type: 'tool-generate_instagram_post_image',
        toolCallId: `call-${url}`,
        state: 'output-available',
        input: { prompt: 'x' },
        output: JSON.stringify({
          url,
          name: 'x.webp',
          mediaS3Key: 'users/u/x.webp',
        }),
      },
    ],
  } as UIMessage
}

describe('latestGeneratedImageUrlFromMessages', () => {
  it('returns null when there are no generate tool results', () => {
    expect(latestGeneratedImageUrlFromMessages([])).toBeNull()
    expect(
      latestGeneratedImageUrlFromMessages([
        { id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] } as UIMessage,
      ]),
    ).toBeNull()
  })

  it('returns the latest successful generate URL', () => {
    const messages = [assistantWithGenerateOutput(URL_A), assistantWithGenerateOutput(URL_B)]
    expect(latestGeneratedImageUrlFromMessages(messages)).toBe(URL_B)
  })

  it('skips error outputs', () => {
    const messages = [
      assistantWithGenerateOutput(URL_A),
      {
        id: 'err',
        role: 'assistant',
        parts: [
          {
            type: 'tool-generate_instagram_post_image',
            toolCallId: 'call-err',
            state: 'output-available',
            input: { prompt: 'x' },
            output: 'Error: generate failed (502)',
          },
        ],
      } as UIMessage,
    ]
    expect(latestGeneratedImageUrlFromMessages(messages)).toBe(URL_A)
  })
})
