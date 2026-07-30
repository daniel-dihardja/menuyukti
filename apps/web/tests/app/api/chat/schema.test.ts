import { describe, expect, it } from 'vitest'

import { chatRequestBodySchema } from '@/app/api/chat/schema'
import { CHAT_VISUALIZATION_ID_VALUES } from '@/lib/chat/visualization-ids'

const VALID_MEDIA = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp'
const AGENT_THREAD = 'thread-1'

describe('chatRequestBodySchema', () => {
  it('accepts visualization reference and analyticsRunId', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      locationId: '10',
      analyticsRunId: '99',
      referencedVisualizationId: 'pair_lift_matrix_heatmap',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects unknown visualization ids', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      locationId: '10',
      referencedVisualizationId: 'unknown_chart',
    })
    expect(parsed.success).toBe(false)
  })

  it('matches chat visualization catalog ids', () => {
    for (const id of CHAT_VISUALIZATION_ID_VALUES) {
      const parsed = chatRequestBodySchema.safeParse({
        messages: [],
        agentThreadId: AGENT_THREAD,
        referencedVisualizationId: id,
      })
      expect(parsed.success).toBe(true)
    }
  })

  it('requires agentThreadId', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      locationId: '10',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects legacy workflowId-only bodies', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      workflowId: '1',
      locationId: '10',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts storyAssetAction clear with safe filename', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      locationId: '10',
      chatMode: 'story_image_assistant',
      storyAssetAction: { op: 'clear', name: VALID_MEDIA },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.storyAssetAction).toEqual({ op: 'clear', name: VALID_MEDIA })
    }
  })

  it('rejects storyAssetAction with unsafe filename', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      storyAssetAction: { op: 'clear', name: '../secret.png' },
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts referencedPostMediaNames with safe post filenames', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'Look' }] }],
      agentThreadId: AGENT_THREAD,
      referencedPostMediaNames: [VALID_MEDIA],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.referencedPostMediaNames).toEqual([VALID_MEDIA])
    }
  })

  it('rejects unsafe media filenames', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      referencedMediaNames: ['../secret.png'],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects unsafe post media filenames', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      referencedPostMediaNames: ['not-a-uuid.png'],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects more than 4 media names', () => {
    const validNames = [
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee0.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee2.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee3.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee4.webp',
    ]
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      referencedMediaNames: validNames,
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects more than 4 post media names', () => {
    const validNames = [
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee0.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee2.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee3.webp',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee4.webp',
    ]
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      referencedPostMediaNames: validNames,
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts generationModel on chat requests', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'Generate a story' }] }],
      agentThreadId: AGENT_THREAD,
      locationId: '10',
      chatMode: 'story_image_assistant',
      generationModel: 'nano-banana-2',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.generationModel).toBe('nano-banana-2')
    }
  })

  it('accepts IG Studio post generation context', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'Generate' }] }],
      agentThreadId: AGENT_THREAD,
      postId: '12',
      pageId: '34',
      generationModel: 'gemini-2.5-flash-image',
      imageFormat: 'feed',
      imageQuality: 'high',
      styleId: 7,
      generationReferences: [
        { type: 'photo', name: VALID_MEDIA },
        { type: 'background-color', color: '#ffffff' },
      ],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.postId).toBe('12')
      expect(parsed.data.pageId).toBe('34')
      expect(parsed.data.styleId).toBe(7)
      expect(parsed.data.generationReferences).toHaveLength(2)
    }
  })

  it('rejects invalid post generation ids', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      postId: 'abc',
      pageId: '34',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts valid chatMode values', () => {
    for (const chatMode of ['general', 'story_image_assistant'] as const) {
      const parsed = chatRequestBodySchema.safeParse({
        messages: [],
        agentThreadId: AGENT_THREAD,
        chatMode,
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.chatMode).toBe(chatMode)
      }
    }
  })

  it('rejects unknown chatMode', () => {
    const parsed = chatRequestBodySchema.safeParse({
      messages: [],
      agentThreadId: AGENT_THREAD,
      chatMode: 'copywriter',
    })
    expect(parsed.success).toBe(false)
  })
})
