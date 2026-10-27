import type { UIMessage } from 'ai'
import { isToolUIPart } from 'ai'

export type AssistantTrailingThinkingLabelKey = 'thinking'

export type AssistantTrailingThinkingState = {
  show: boolean
  labelKey: AssistantTrailingThinkingLabelKey
}

export type AssistantTrailingThinkingOptions = {
  visibleMessages?: readonly UIMessage[]
}

type PartScanResult = {
  hasTool: boolean
  hasInFlightTool: boolean
  hasTextAfterLastTool: boolean
}

function scanAssistantParts(parts: UIMessage['parts']): PartScanResult {
  let hasTool = false
  let hasInFlightTool = false
  let sawTool = false
  let hasTextAfterLastTool = false

  if (!parts?.length) {
    return { hasTool, hasInFlightTool, hasTextAfterLastTool }
  }

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

  return { hasTool, hasInFlightTool, hasTextAfterLastTool }
}

/**
 * When true, append a trailing spinner under rendered parts.
 * Covers the gap after completed tools while the model prepares the next tool call.
 */
export function getAssistantTrailingThinkingState(
  message: UIMessage,
  isActiveStream: boolean,
  _options: AssistantTrailingThinkingOptions = {},
): AssistantTrailingThinkingState {
  const hidden: AssistantTrailingThinkingState = { show: false, labelKey: 'thinking' }

  if (!isActiveStream || message.role !== 'assistant') {
    return hidden
  }

  const parts = message.parts
  if (!parts?.length) {
    return hidden
  }

  const { hasTool, hasInFlightTool, hasTextAfterLastTool } = scanAssistantParts(parts)
  if (!hasTool || hasInFlightTool || hasTextAfterLastTool) {
    return hidden
  }

  return {
    show: true,
    labelKey: 'thinking',
  }
}

export function shouldShowAssistantTrailingThinking(
  message: UIMessage,
  isActiveStream: boolean,
  options: AssistantTrailingThinkingOptions = {},
): boolean {
  return getAssistantTrailingThinkingState(message, isActiveStream, options).show
}
