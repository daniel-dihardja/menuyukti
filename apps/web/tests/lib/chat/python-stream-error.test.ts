import { describe, expect, it } from 'vitest'

import { pythonStreamErrorText } from '@/lib/chat/python-stream-error'

describe('pythonStreamErrorText', () => {
  it('prefers message when agents sends structured { error: true, message }', () => {
    expect(
      pythonStreamErrorText({
        error: true,
        message: 'Found AIMessages with tool_calls that do not have a corresponding ToolMessage',
      }),
    ).toBe('Found AIMessages with tool_calls that do not have a corresponding ToolMessage')
  })

  it('falls back to string error for legacy payloads', () => {
    expect(pythonStreamErrorText({ error: 'legacy failure' })).toBe('legacy failure')
  })

  it('returns a generic message when neither field is usable', () => {
    expect(pythonStreamErrorText({ error: true })).toBe('Chat request failed')
    expect(pythonStreamErrorText({})).toBe('Chat request failed')
  })
})
