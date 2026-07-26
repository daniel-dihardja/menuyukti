import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import { CHAT_MAX_IMAGES } from '@/lib/chat/chat-image-limits'
import {
  AUTO_ATTACHED_GENERATED_ID,
  collectNewGeneratedImageToolResults,
  findLatestGeneratedImageFromMessages,
  upsertAutoAttachedGeneratedImage,
  type PendingMediaAttachment,
} from '@/lib/chat/workflow-chat-auto-attach'

const IMAGE_A = {
  url: 'https://bucket.s3.amazonaws.com/users/u/posts/aaa.webp',
  name: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp',
  mediaS3Key: 'users/u/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp',
}

const IMAGE_B = {
  url: 'https://bucket.s3.amazonaws.com/users/u/posts/bbb.webp',
  name: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff.webp',
  mediaS3Key: 'users/u/posts/bbbbbbbb-cccc-dddd-eeee-ffffffffffff.webp',
}

function assistantWithGenerateTool(toolCallId: string, output: Record<string, string>): UIMessage {
  return {
    id: `msg-${toolCallId}`,
    role: 'assistant',
    parts: [
      {
        type: 'tool-generate_instagram_post_image',
        toolCallId,
        state: 'output-available',
        output: JSON.stringify(output),
        input: {},
      } as UIMessage['parts'][number],
    ],
  }
}

describe('upsertAutoAttachedGeneratedImage', () => {
  it('adds a post chip with the stable auto-attach id', () => {
    const next = upsertAutoAttachedGeneratedImage([], IMAGE_A)
    expect(next).toEqual([
      {
        id: AUTO_ATTACHED_GENERATED_ID,
        kind: 'post',
        name: IMAGE_A.name,
        url: IMAGE_A.url,
        mediaType: 'image/webp',
      },
    ])
  })

  it('replaces an existing auto-attached chip instead of stacking', () => {
    const prev = upsertAutoAttachedGeneratedImage([], IMAGE_A)
    const next = upsertAutoAttachedGeneratedImage(prev, IMAGE_B)
    expect(next).toHaveLength(1)
    expect(next[0]?.name).toBe(IMAGE_B.name)
    expect(next[0]?.id).toBe(AUTO_ATTACHED_GENERATED_ID)
  })

  it('does not add when at max and no auto-attach slot exists yet', () => {
    const prev: PendingMediaAttachment[] = Array.from({ length: CHAT_MAX_IMAGES }, (_, i) => ({
      id: `photo-${i}`,
      kind: 'photo',
      name: `${i}.webp`,
      url: `https://example.com/${i}.webp`,
      mediaType: 'image/webp',
    }))
    expect(upsertAutoAttachedGeneratedImage(prev, IMAGE_A)).toBe(prev)
  })
})

describe('findLatestGeneratedImageFromMessages', () => {
  it('returns the last successful generated image in the thread', () => {
    const messages = [
      assistantWithGenerateTool('t1', IMAGE_A),
      assistantWithGenerateTool('t2', IMAGE_B),
    ]
    expect(findLatestGeneratedImageFromMessages(messages)).toEqual(IMAGE_B)
  })

  it('returns null when there are no generated images', () => {
    expect(findLatestGeneratedImageFromMessages([])).toBeNull()
  })
})

describe('collectNewGeneratedImageToolResults', () => {
  it('skips tool call ids already seen', () => {
    const messages = [
      assistantWithGenerateTool('t1', IMAGE_A),
      assistantWithGenerateTool('t2', IMAGE_B),
    ]
    const found = collectNewGeneratedImageToolResults(messages, new Set(['t1']))
    expect(found).toEqual([{ toolCallId: 't2', image: IMAGE_B }])
  })

  it('returns empty when auto-attach candidates are all seen', () => {
    const messages = [assistantWithGenerateTool('t1', IMAGE_A)]
    expect(collectNewGeneratedImageToolResults(messages, new Set(['t1']))).toEqual([])
  })
})
