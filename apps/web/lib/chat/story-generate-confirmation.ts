import type { UIMessage } from 'ai'
import { isToolUIPart } from 'ai'

/** Model-facing canned replies for Story Phase 3 confirm buttons. */
export const STORY_GENERATE_CONFIRM_REPLY = 'Yes, generate'
export const STORY_GENERATE_CHANGE_REPLY = 'I want to change something'

const REQUEST_STORY_GENERATE_CONFIRMATION_TOOL = 'request_story_generate_confirmation'
const GENERATE_INSTAGRAM_POST_IMAGE_TOOL = 'generate_instagram_post_image'

/** Matches assistant copy that invites Generate/Change without (or instead of) the tool. */
const STORY_CONFIRM_ASK_RE =
  /click(?:ing)?\s+generate|\bgenerate\b.{0,40}\bchange\b|\bchange\b.{0,40}\bgenerate\b|confirm(?:ation)?\s+by\s+click|use\s+(?:\*\*)?generate(?:\*\*)?|please\s+confirm.*generat/i

function resolveToolName(part: UIMessage['parts'][number]): string | null {
  if (!isToolUIPart(part)) return null
  if (part.type === 'dynamic-tool') {
    return part.toolName
  }
  return part.type.split('-').slice(1).join('-')
}

export function getAssistantMessagePlainText(message: UIMessage): string {
  const parts = message.parts
  if (!parts?.length) return ''
  return parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n')
}

/** True when the message includes a finished `request_story_generate_confirmation` tool part. */
export function messageHasCompletedStoryGenerateConfirmation(message: UIMessage): boolean {
  const parts = message.parts
  if (!parts?.length) return false
  for (const part of parts) {
    if (!isToolUIPart(part)) continue
    if (resolveToolName(part) !== REQUEST_STORY_GENERATE_CONFIRMATION_TOOL) continue
    if (part.state === 'input-streaming' || part.state === 'input-available') continue
    return true
  }
  return false
}

/** True when assistant text asks the user to confirm via Generate (even if the tool was skipped). */
export function messageTextLooksLikeStoryGenerateConfirmationAsk(message: UIMessage): boolean {
  return STORY_CONFIRM_ASK_RE.test(getAssistantMessagePlainText(message))
}

/** True when this message already ran image generation (do not show confirm buttons). */
export function messageHasGenerateInstagramPostImage(message: UIMessage): boolean {
  const parts = message.parts
  if (!parts?.length) return false
  for (const part of parts) {
    if (!isToolUIPart(part)) continue
    if (resolveToolName(part) !== GENERATE_INSTAGRAM_POST_IMAGE_TOOL) continue
    return true
  }
  return false
}

/**
 * Generate / Change buttons are only actionable on the latest message while chat is idle,
 * before a generate tool runs, when the confirm tool ran or the assistant text asks for it.
 */
export function isStoryGenerateConfirmationActionable(args: {
  message: UIMessage
  messages: readonly UIMessage[]
  status: string
}): boolean {
  const { message, messages, status } = args
  if (status !== 'ready') return false
  if (messages.length === 0) return false
  if (messages[messages.length - 1]?.id !== message.id) return false
  if (messageHasGenerateInstagramPostImage(message)) return false
  return (
    messageHasCompletedStoryGenerateConfirmation(message) ||
    messageTextLooksLikeStoryGenerateConfirmationAsk(message)
  )
}
