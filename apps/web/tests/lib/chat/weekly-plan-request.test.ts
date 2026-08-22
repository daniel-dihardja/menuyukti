import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import { isWeeklyPlanRequest } from '@/lib/chat/weekly-plan-request'

function user(text: string, id = 'user-1'): UIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] } as UIMessage
}

function assistant(id = 'assistant-1'): UIMessage {
  return { id, role: 'assistant', parts: [] } as UIMessage
}

describe('isWeeklyPlanRequest', () => {
  it('matches weekly schedule tool phrasing', () => {
    expect(
      isWeeklyPlanRequest(
        [user('Present the plan with the weekly schedule tool.'), assistant()],
        'assistant-1',
      ),
    ).toBe(true)
  })

  it('uses the nearest preceding user message', () => {
    const messages = [
      user('Create a weekly Instagram plan for this venue.', 'user-old'),
      user('What are our hours?', 'user-new'),
      assistant('assistant-1'),
    ]
    expect(isWeeklyPlanRequest(messages, 'assistant-1')).toBe(false)
  })
})
