import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import { shouldShowAssistantThinkingFallback } from '@/lib/chat/should-show-assistant-thinking-fallback'

function msg(parts: UIMessage['parts'] | undefined): UIMessage {
  return { id: '1', role: 'assistant', parts } as UIMessage
}

describe('shouldShowAssistantThinkingFallback', () => {
  it('shows fallback when streaming with no parts', () => {
    expect(shouldShowAssistantThinkingFallback(msg([]), true)).toBe(true)
    expect(shouldShowAssistantThinkingFallback(msg(undefined), true)).toBe(true)
  })

  it('hides fallback when a tool part is present even without text', () => {
    expect(
      shouldShowAssistantThinkingFallback(
        msg([
          {
            type: 'dynamic-tool',
            toolCallId: '1',
            toolName: 'search_web',
            state: 'input-available',
            input: {},
          },
        ]),
        true,
      ),
    ).toBe(false)
  })

  it('hides fallback once assistant text exists', () => {
    expect(shouldShowAssistantThinkingFallback(msg([{ type: 'text', text: 'Hello' }]), true)).toBe(
      false,
    )
  })

  it('never shows fallback when not streaming', () => {
    expect(shouldShowAssistantThinkingFallback(msg([]), false)).toBe(false)
  })
})
