import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import {
  latestStoryAssetsFromMessages,
  parseStoryAssetsToolOutput,
} from '@/lib/chat/story-assets-from-messages'

const STYLE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp'
const PRODUCT = '11111111-2222-3333-4444-555555555555.jpg'

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
              story_assets: [{ role: 'product', name: PRODUCT, note: 'bowl' }],
              message: 'Cleared',
            }),
          },
        ],
      },
    ] as UIMessage[]

    expect(latestStoryAssetsFromMessages(messages)).toEqual([
      { role: 'product', name: PRODUCT, note: 'bowl' },
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
