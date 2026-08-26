import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'

import {
  getAssistantTrailingThinkingState,
  shouldShowAssistantTrailingThinking,
} from '@/lib/chat/should-show-assistant-trailing-thinking'
import { isWeeklyPlanRequest } from '@/lib/chat/weekly-plan-request'

function assistant(parts: UIMessage['parts'] | undefined, id = 'assistant-1'): UIMessage {
  return { id, role: 'assistant', parts } as UIMessage
}

function user(text: string, id = 'user-1'): UIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] } as UIMessage
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

describe('isWeeklyPlanRequest', () => {
  it('matches quick-prompt style weekly plan requests', () => {
    const messages = [
      user('Create a weekly Instagram plan for this venue.'),
      assistant([chartDone]),
    ]
    expect(isWeeklyPlanRequest(messages, 'assistant-1')).toBe(true)
  })

  it('does not match unrelated user messages', () => {
    const messages = [user('What are our opening hours?'), assistant([locationDone])]
    expect(isWeeklyPlanRequest(messages, 'assistant-1')).toBe(false)
  })
})

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
            toolName: 'present_weekly_instagram_schedule',
            state: 'input-streaming',
            input: {},
          },
        ]),
        true,
      ),
    ).toBe(false)
  })

  it('hides once assistant text follows the last tool for generic chart questions', () => {
    const messages = [
      user('Explain this heatmap.'),
      assistant([chartDone, { type: 'text', text: 'Here is your plan.' }]),
    ]
    expect(
      shouldShowAssistantTrailingThinking(messages[1]!, true, { visibleMessages: messages }),
    ).toBe(false)
  })

  it('shows during weekly plan gap when text precedes the schedule tool', () => {
    const messages = [
      user('Create a weekly Instagram plan for this venue.'),
      assistant([
        locationDone,
        chartDone,
        { type: 'text', text: 'I loaded opening hours and sales signals.' },
      ]),
    ]
    expect(
      shouldShowAssistantTrailingThinking(messages[1]!, true, { visibleMessages: messages }),
    ).toBe(true)
  })

  it('hides after present_weekly_instagram_schedule completes even with follow-up text', () => {
    const messages = [
      user('Create a weekly Instagram plan for this venue.'),
      assistant([
        locationDone,
        chartDone,
        {
          type: 'dynamic-tool',
          toolCallId: '3',
          toolName: 'present_weekly_instagram_schedule',
          state: 'output-available',
          input: {},
          output: 'ok',
        },
        { type: 'text', text: 'Here is your weekly plan.' },
      ]),
    ]
    expect(
      shouldShowAssistantTrailingThinking(messages[1]!, true, { visibleMessages: messages }),
    ).toBe(false)
  })

  it('does not show weekly plan gap for location-only Q&A with text', () => {
    const messages = [
      user('What are our opening hours?'),
      assistant([locationDone, { type: 'text', text: 'You are open Monday through Friday.' }]),
    ]
    expect(
      shouldShowAssistantTrailingThinking(messages[1]!, true, { visibleMessages: messages }),
    ).toBe(false)
  })
})

describe('getAssistantTrailingThinkingState', () => {
  it('returns buildingWeeklyPlan label during weekly plan gap', () => {
    const messages = [
      user('Create a weekly Instagram plan for this venue.'),
      assistant([locationDone, chartDone, { type: 'text', text: 'Building…' }]),
    ]
    expect(
      getAssistantTrailingThinkingState(messages[1]!, true, { visibleMessages: messages }),
    ).toEqual({ show: true, labelKey: 'buildingWeeklyPlan' })
  })

  it('returns thinking label for generic tool gap without text', () => {
    expect(getAssistantTrailingThinkingState(assistant([chartDone]), true)).toEqual({
      show: true,
      labelKey: 'thinking',
    })
  })
})
