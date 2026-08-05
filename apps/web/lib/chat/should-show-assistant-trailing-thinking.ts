import type { UIMessage } from 'ai'
import { isToolUIPart } from 'ai'

/**
 * When true, append a trailing “Thinking…” spinner under rendered parts.
 * Covers the gap after completed tools (e.g. charts) while the model prepares
 * the next tool call (e.g. weekly plan) and no in-flight tool UI is showing yet.
 */
export function shouldShowAssistantTrailingThinking(
  message: UIMessage,
  isActiveStream: boolean,
): boolean {
  if (!isActiveStream || message.role !== 'assistant') {
    return false
  }

  const parts = message.parts
  if (!parts?.length) {
    return false
  }

  let hasTool = false
  let hasInFlightTool = false
  let sawTool = false
  let hasTextAfterLastTool = false

  for (const part of parts) {
    if (part.type === 'step-start') {
      continue
    }
    if (isToolUIPart(part)) {
      hasTool = true
      sawTool = true
      hasTextAfterLastTool = false
      if (part.state === 'input-streaming' || part.state === 'input-available') {
        hasInFlightTool = true
      }
      continue
    }
    if (part.type === 'text' && part.text.length > 0 && sawTool) {
      hasTextAfterLastTool = true
    }
  }

  return hasTool && !hasInFlightTool && !hasTextAfterLastTool
}
