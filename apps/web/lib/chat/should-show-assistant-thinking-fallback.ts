import type { UIMessage } from 'ai'

/**
 * When true, show the generic “Thinking…” spinner instead of message parts.
 * Prefer rendering parts whenever tools/reasoning/etc. are present so status UI is visible.
 */
export function shouldShowAssistantThinkingFallback(
  message: UIMessage,
  isActiveStream: boolean,
): boolean {
  if (!isActiveStream || message.role !== 'assistant') {
    return false
  }

  const parts = message.parts
  if (!parts?.length) {
    return true
  }

  return !parts.some((part) => {
    if (part.type === 'text') {
      return part.text.length > 0
    }
    if (part.type === 'step-start') {
      return false
    }
    return true
  })
}
