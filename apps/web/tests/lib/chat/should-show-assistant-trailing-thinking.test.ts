import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import { shouldShowAssistantTrailingThinking } from '@/lib/chat/should-show-assistant-trailing-thinking'

function msg(parts: UIMessage['parts'] | undefined): UIMessage {
  return { id: '1', role: 'assistant', parts } as UIMessage
}

describe('shouldShowAssistantTrailingThinking', () => {
  it('is false when not streaming or empty parts', () => {
    expect(shouldShowAssistantTrailingThinking(msg([]), true)).toBe(false)
    expect(
      shouldShowAssistantTrailingThinking(
        msg([
          {
            type: 'dynamic-tool',
            toolCallId: '1',
            toolName: 'get_chart_data',
            state: 'output-available',
            input: {},
            output: 'ok',
          },
        ]),
        false,
      ),
    ).toBe(false)
  })

  it('shows after completed tools while stream continues with no follow-up text', () => {
    expect(
      shouldShowAssistantTrailingThinking(
        msg([
          {
            type: 'dynamic-tool',
            toolCallId: '1',
            toolName: 'get_chart_data',
            state: 'output-available',
            input: {},
            output: 'ok',
          },
        ]),
        true,
      ),
    ).toBe(true)
  })

  it('hides when a tool is still in flight', () => {
    expect(
      shouldShowAssistantTrailingThinking(
        msg([
          {
            type: 'dynamic-tool',
            toolCallId: '1',
            toolName: 'get_chart_data',
            state: 'output-available',
            input: {},
            output: 'ok',
          },
          {
            type: 'dynamic-tool',
            toolCallId: '2',
            toolName: 'present_weekly_instagram_schedule',
            state: 'input-streaming',
            input: {},
          },
        ]),
        true,
      ),
    ).toBe(false)
  })

  it('hides once assistant text follows the last tool', () => {
    expect(
      shouldShowAssistantTrailingThinking(
        msg([
          {
            type: 'dynamic-tool',
            toolCallId: '1',
            toolName: 'get_chart_data',
            state: 'output-available',
            input: {},
            output: 'ok',
          },
          { type: 'text', text: 'Here is your plan.' },
        ]),
        true,
      ),
    ).toBe(false)
  })
})
