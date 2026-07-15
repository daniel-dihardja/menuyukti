import type { UIMessage } from 'ai'
import { isReasoningUIPart } from 'ai'

type ReasoningPart = Extract<UIMessage['parts'][number], { type: 'reasoning' }>

export type PartitionedMessageParts = {
  reasoningParts: ReasoningPart[]
  otherParts: UIMessage['parts']
}

/**
 * Splits message parts into reasoning vs everything else so the UI can render
 * one consolidated Reasoning block (AI Elements pattern).
 */
export function partitionMessageParts(
  parts: UIMessage['parts'] | undefined,
): PartitionedMessageParts {
  if (!parts?.length) {
    return { reasoningParts: [], otherParts: [] }
  }

  const reasoningParts: ReasoningPart[] = []
  const otherParts: UIMessage['parts'] = []

  for (const part of parts) {
    if (isReasoningUIPart(part)) {
      reasoningParts.push(part)
    } else {
      otherParts.push(part)
    }
  }

  return { reasoningParts, otherParts }
}

export function joinReasoningText(reasoningParts: ReasoningPart[]): string {
  return reasoningParts.map((part) => part.text).join('\n\n')
}

export function isReasoningStreaming(
  reasoningParts: ReasoningPart[],
  isStreaming: boolean,
): boolean {
  if (!isStreaming || reasoningParts.length === 0) {
    return false
  }
  const last = reasoningParts[reasoningParts.length - 1]
  return last?.state === 'streaming'
}
