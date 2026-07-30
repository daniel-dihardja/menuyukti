import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'

import {
  isStoryGenerateConfirmationActionable,
  messageHasCompletedStoryGenerateConfirmation,
  messageHasGenerateInstagramPostImage,
  messageTextLooksLikeStoryGenerateConfirmationAsk,
} from '@/lib/chat/story-generate-confirmation'

function confirmToolMessage(
  id: string,
  state: 'input-available' | 'output-available' = 'output-available',
): UIMessage {
  return {
    id,
    role: 'assistant',
    parts: [
      { type: 'text', text: 'Does this look right?' },
      {
        type: 'tool-request_story_generate_confirmation',
        toolCallId: `call-${id}`,
        state,
        input: {},
        ...(state === 'output-available'
          ? { output: '{"ok":true,"action":"request_confirmation"}' }
          : {}),
      },
    ],
  } as UIMessage
}

function confirmPlusGenerateMessage(id: string): UIMessage {
  return {
    id,
    role: 'assistant',
    parts: [
      { type: 'text', text: 'Generating…' },
      {
        type: 'tool-request_story_generate_confirmation',
        toolCallId: `call-confirm-${id}`,
        state: 'output-available',
        input: {},
        output: '{"ok":true,"action":"request_confirmation"}',
      },
      {
        type: 'tool-generate_instagram_post_image',
        toolCallId: `call-gen-${id}`,
        state: 'output-available',
        input: {},
        output: '{"imageUrl":"https://example.com/x.webp"}',
      },
    ],
  } as UIMessage
}

function textOnlyConfirmAsk(id: string): UIMessage {
  return {
    id,
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: "I'll generate the image with this information. Please confirm by clicking Generate or let me know if you want to make any changes!",
      },
    ],
  }
}

describe('story-generate-confirmation', () => {
  it('detects a completed confirmation tool part', () => {
    expect(messageHasCompletedStoryGenerateConfirmation(confirmToolMessage('a'))).toBe(true)
    expect(
      messageHasCompletedStoryGenerateConfirmation(confirmToolMessage('b', 'input-available')),
    ).toBe(false)
    expect(
      messageHasCompletedStoryGenerateConfirmation({
        id: 'c',
        role: 'assistant',
        parts: [{ type: 'text', text: 'hi' }],
      }),
    ).toBe(false)
  })

  it('detects confirmation asks from assistant text alone', () => {
    expect(messageTextLooksLikeStoryGenerateConfirmationAsk(textOnlyConfirmAsk('t'))).toBe(true)
    expect(
      messageTextLooksLikeStoryGenerateConfirmationAsk({
        id: 'x',
        role: 'assistant',
        parts: [{ type: 'text', text: 'What dish should we feature?' }],
      }),
    ).toBe(false)
  })

  it('enables actions only on the latest ready message', () => {
    const older = confirmToolMessage('old')
    const latest = confirmToolMessage('new')
    expect(
      isStoryGenerateConfirmationActionable({
        message: latest,
        messages: [older, latest],
        status: 'ready',
      }),
    ).toBe(true)
    expect(
      isStoryGenerateConfirmationActionable({
        message: older,
        messages: [older, latest],
        status: 'ready',
      }),
    ).toBe(false)
    expect(
      isStoryGenerateConfirmationActionable({
        message: latest,
        messages: [older, latest],
        status: 'streaming',
      }),
    ).toBe(false)
  })

  it('enables actions for text-only Generate asks when ready', () => {
    const msg = textOnlyConfirmAsk('text')
    expect(
      isStoryGenerateConfirmationActionable({
        message: msg,
        messages: [msg],
        status: 'ready',
      }),
    ).toBe(true)
  })

  it('disables actions when the same message already generated an image', () => {
    const mixed = confirmPlusGenerateMessage('mixed')
    expect(messageHasGenerateInstagramPostImage(mixed)).toBe(true)
    expect(
      isStoryGenerateConfirmationActionable({
        message: mixed,
        messages: [mixed],
        status: 'ready',
      }),
    ).toBe(false)
  })
})
