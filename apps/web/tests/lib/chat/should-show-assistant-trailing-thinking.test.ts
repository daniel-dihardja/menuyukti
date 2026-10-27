import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import {
  getAssistantTrailingThinkingState,
  shouldShowAssistantTrailingThinking,
} from '@/lib/chat/should-show-assistant-trailing-thinking'

function assistant(parts: UIMessage['parts'] | undefined, id = 'assistant-1'): UIMessage {
  return { id, role: 'assistant', parts } as UIMessage
}

const chartDone = {
  type: 'dynamic-tool' as const,
  toolCallId: '1',
  toolName: 'get_chart_data',
  state: 'output-available' as const,
  input: {},
  output: 'ok',
}

const locationDone = {
  type: 'dynamic-tool' as const,
  toolCallId: '2',
  toolName: 'get_location_data',
  state: 'output-available' as const,
  input: {},
  output: 'ok',
}

describe('shouldShowAssistantTrailingThinking', () => {
  it('is false when not streaming or empty parts', () => {
    expect(shouldShowAssistantTrailingThinking(assistant([]), true)).toBe(false)
    expect(shouldShowAssistantTrailingThinking(assistant([chartDone]), false)).toBe(false)
  })

  it('shows after completed tools while stream continues with no follow-up text', () => {
    expect(shouldShowAssistantTrailingThinking(assistant([chartDone]), true)).toBe(true)
  })

  it('hides when a tool is still in flight', () => {
    expect(
      shouldShowAssistantTrailingThinking(
        assistant([
          chartDone,
          {
            type: 'dynamic-tool',
            toolCallId: '2',
            toolName: 'get_location_data',
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
        assistant([chartDone, { type: 'text', text: 'Here is your plan.' }]),
        true,
      ),
    ).toBe(false)
  })

  it('hides for location Q&A once text is present', () => {
    expect(
      shouldShowAssistantTrailingThinking(
        assistant([locationDone, { type: 'text', text: 'You are open Monday through Friday.' }]),
        true,
      ),
    ).toBe(false)
  })
})

describe('getAssistantTrailingThinkingState', () => {
  it('returns thinking label for generic tool gap without text', () => {
    expect(getAssistantTrailingThinkingState(assistant([chartDone]), true)).toEqual({
      show: true,
      labelKey: 'thinking',
    })
  })

  it('hides when follow-up text is already present', () => {
    expect(
      getAssistantTrailingThinkingState(
        assistant([chartDone, { type: 'text', text: 'Building…' }]),
        true,
      ),
    ).toEqual({ show: false, labelKey: 'thinking' })
  })
})
