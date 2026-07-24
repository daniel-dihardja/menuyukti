import { describe, expect, it } from 'vitest'

import {
  pushPendingToolCallId,
  resolveToolEndCallId,
  takePendingToolCallId,
} from '@/lib/chat/pending-tool-call-ids'

describe('pending tool call ids', () => {
  it('keeps FIFO ids when the same tool runs twice without explicit end ids', () => {
    const pending = new Map<string, string[]>()
    pushPendingToolCallId(pending, 'get_chart_data', 'a')
    pushPendingToolCallId(pending, 'get_chart_data', 'b')
    expect(takePendingToolCallId(pending, 'get_chart_data')).toBe('a')
    expect(takePendingToolCallId(pending, 'get_chart_data')).toBe('b')
    expect(takePendingToolCallId(pending, 'get_chart_data')).toBeUndefined()
  })

  it('resolves explicit tool_call_id even when ends arrive out of start order', () => {
    const pending = new Map<string, string[]>()
    pushPendingToolCallId(pending, 'get_chart_data', 'call_venue')
    pushPendingToolCallId(pending, 'get_chart_data', 'call_menu')
    expect(resolveToolEndCallId(pending, 'get_chart_data', 'call_menu', 'fallback')).toBe(
      'call_menu',
    )
    expect(resolveToolEndCallId(pending, 'get_chart_data', 'call_venue', 'fallback')).toBe(
      'call_venue',
    )
    expect(pending.size).toBe(0)
  })
})
