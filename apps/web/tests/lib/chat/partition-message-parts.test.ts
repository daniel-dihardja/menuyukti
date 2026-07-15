import { describe, expect, it } from 'vitest'

import {
  isReasoningStreaming,
  joinReasoningText,
  partitionMessageParts,
} from '@/lib/chat/partition-message-parts'

describe('partitionMessageParts', () => {
  it('returns empty arrays when parts are undefined or empty', () => {
    expect(partitionMessageParts(undefined)).toEqual({ reasoningParts: [], otherParts: [] })
    expect(partitionMessageParts([])).toEqual({ reasoningParts: [], otherParts: [] })
  })

  it('separates reasoning from other part types', () => {
    const textPart = { type: 'text' as const, text: 'Hello' }
    const reasoningA = { type: 'reasoning' as const, text: 'Step 1', state: 'done' as const }
    const reasoningB = { type: 'reasoning' as const, text: 'Step 2', state: 'done' as const }
    const toolPart = {
      type: 'tool-getWeather' as const,
      toolCallId: 'call-1',
      state: 'output-available' as const,
      input: {},
      output: {},
    }

    const result = partitionMessageParts([textPart, reasoningA, toolPart, reasoningB])

    expect(result.reasoningParts).toEqual([reasoningA, reasoningB])
    expect(result.otherParts).toEqual([textPart, toolPart])
  })
})

describe('joinReasoningText', () => {
  it('joins reasoning parts with blank lines', () => {
    const parts = [
      { type: 'reasoning' as const, text: 'First', state: 'done' as const },
      { type: 'reasoning' as const, text: 'Second', state: 'done' as const },
    ]
    expect(joinReasoningText(parts)).toBe('First\n\nSecond')
  })
})

describe('isReasoningStreaming', () => {
  it('is false when not streaming or no reasoning parts', () => {
    expect(isReasoningStreaming([], true)).toBe(false)
    expect(
      isReasoningStreaming([{ type: 'reasoning', text: 'x', state: 'streaming' }], false),
    ).toBe(false)
  })

  it('is true when streaming and last reasoning part is streaming', () => {
    expect(
      isReasoningStreaming(
        [
          { type: 'reasoning', text: 'done', state: 'done' },
          { type: 'reasoning', text: 'live', state: 'streaming' },
        ],
        true,
      ),
    ).toBe(true)
  })
})
