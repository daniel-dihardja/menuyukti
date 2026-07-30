import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import {
  latestStoryAssetsFromMessages,
  parseGenerateStoryAssetsOutput,
  parseStoryAssetsToolOutput,
  resultThumbnailUrlFromMessages,
} from '@/lib/chat/story-assets-from-messages'

const STYLE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp'
const CONTENT = '11111111-2222-3333-4444-555555555555.jpg'
const RESULT = 'dddddddd-eeee-ffff-aaaa-111111111111.webp'

describe('parseStoryAssetsToolOutput', () => {
  it('parses ok JSON snapshot', () => {
    const parsed = parseStoryAssetsToolOutput(
      JSON.stringify({
        ok: true,
        action: 'save',
        story_assets: [{ role: 'style', name: STYLE, note: 'neon' }],
        message: 'Saved style asset',
      }),
    )
    expect(parsed).toEqual({
      ok: true,
      action: 'save',
      story_assets: [{ role: 'style', name: STYLE, note: 'neon' }],
      message: 'Saved style asset',
    })
  })

  it('rejects ok=false payloads', () => {
    expect(
      parseStoryAssetsToolOutput(
        JSON.stringify({
          ok: false,
          action: 'save',
          story_assets: [],
          message: 'Error: bad',
        }),
      ),
    ).toBeNull()
  })
})

describe('parseGenerateStoryAssetsOutput', () => {
  it('parses save_result generate payload', () => {
    const assets = parseGenerateStoryAssetsOutput(
      JSON.stringify({
        url: 'https://example.com/r.webp',
        name: RESULT,
        action: 'save_result',
        story_assets: [
          { role: 'style', name: STYLE, note: '' },
          { role: 'result', name: RESULT, note: '' },
        ],
        prompt: 'sky',
      }),
    )
    expect(assets).toEqual([
      { role: 'style', name: STYLE, note: '' },
      { role: 'result', name: RESULT, note: '' },
    ])
  })
})

describe('latestStoryAssetsFromMessages', () => {
  it('returns the newest successful save/clear snapshot', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-save_story_asset',
            toolCallId: 'a',
            state: 'output-available',
            input: {},
            output: JSON.stringify({
              ok: true,
              action: 'save',
              story_assets: [{ role: 'style', name: STYLE, note: '' }],
              message: 'Saved',
            }),
          },
        ],
      },
      {
        id: '2',
        role: 'assistant',
        parts: [
          {
            type: 'tool-clear_story_assets',
            toolCallId: 'b',
            state: 'output-available',
            input: {},
            output: JSON.stringify({
              ok: true,
              action: 'clear',
              story_assets: [{ role: 'content', name: CONTENT, note: 'bowl' }],
              message: 'Cleared',
            }),
          },
        ],
      },
    ] as UIMessage[]

    expect(latestStoryAssetsFromMessages(messages)).toEqual([
      { role: 'content', name: CONTENT, note: 'bowl' },
    ])
  })

  it('returns snapshot from generate save_result', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-generate_instagram_post_image',
            toolCallId: 'g',
            state: 'output-available',
            input: {},
            output: JSON.stringify({
              url: 'https://example.com/r.webp',
              name: RESULT,
              action: 'save_result',
              story_assets: [{ role: 'result', name: RESULT, note: '' }],
              prompt: 'edit',
            }),
          },
        ],
      },
    ] as UIMessage[]

    expect(latestStoryAssetsFromMessages(messages)).toEqual([
      { role: 'result', name: RESULT, note: '' },
    ])
  })

  it('returns empty when no story asset tools exist', () => {
    expect(
      latestStoryAssetsFromMessages([
        { id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
      ] as UIMessage[]),
    ).toEqual([])
  })
})

describe('resultThumbnailUrlFromMessages', () => {
  it('returns matching generate url', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-generate_instagram_post_image',
            toolCallId: 'g',
            state: 'output-available',
            input: {},
            output: JSON.stringify({
              url: 'https://example.com/r.webp',
              name: RESULT,
              action: 'save_result',
              story_assets: [{ role: 'result', name: RESULT, note: '' }],
            }),
          },
        ],
      },
    ] as UIMessage[]

    expect(resultThumbnailUrlFromMessages(messages, RESULT)).toBe('https://example.com/r.webp')
  })
})
