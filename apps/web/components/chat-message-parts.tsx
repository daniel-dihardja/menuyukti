'use client'

import type { DynamicToolUIPart, ToolUIPart, UIMessage, UITools } from 'ai'
import { isToolUIPart } from 'ai'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@workspace/ui/components/ai-elements/reasoning'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@workspace/ui/components/ai-elements/tool'
import { MessageResponse } from '@workspace/ui/components/ai-elements/message'
import Link from 'next/link'
import { memo } from 'react'

import {
  isReasoningStreaming,
  joinReasoningText,
  partitionMessageParts,
} from '@/lib/chat/partition-message-parts'
import { UserMessageWithCommandBadges } from '@/components/user-message-with-command-badges'

function ToolPartBlock({ part }: { part: ToolUIPart<UITools> | DynamicToolUIPart }) {
  const isInFlight = part.state === 'input-streaming' || part.state === 'input-available'
  const header =
    part.type === 'dynamic-tool' ? (
      <ToolHeader state={part.state} toolName={part.toolName} type="dynamic-tool" />
    ) : (
      <ToolHeader state={part.state} type={part.type} />
    )

  return (
    <Tool defaultOpen={isInFlight}>
      {header}
      <ToolContent>
        {'input' in part && part.input !== undefined ? <ToolInput input={part.input} /> : null}
        <ToolOutput
          errorText={'errorText' in part ? part.errorText : undefined}
          output={'output' in part ? part.output : undefined}
        />
      </ToolContent>
    </Tool>
  )
}

function AssistantTextPart({ text }: { text: string }) {
  return <MessageResponse>{text}</MessageResponse>
}

export const ChatMessageParts = memo(function ChatMessageParts({
  message,
  role,
  mentionTitles,
  isStreaming = false,
}: {
  message: UIMessage
  role: UIMessage['role']
  /** When set, multi-word `@Milestone title` spans match these titles (campaign chat). */
  mentionTitles?: string[]
  /** When true, assistant text uses incremental Streamdown rendering. */
  isStreaming?: boolean
}) {
  const parts = message.parts

  if (!parts?.length) {
    const fallback = getPlainText(message)
    if (role === 'assistant') {
      return <AssistantTextPart text={fallback} />
    }
    return <UserMessageWithCommandBadges mentionTitles={mentionTitles} text={fallback} />
  }

  const { reasoningParts, otherParts } = partitionMessageParts(parts)
  const reasoningText = joinReasoningText(reasoningParts)
  const reasoningStreaming = isReasoningStreaming(reasoningParts, isStreaming)

  return (
    <>
      {reasoningParts.length > 0 ? (
        <Reasoning isStreaming={reasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoningText}</ReasoningContent>
        </Reasoning>
      ) : null}
      {otherParts.map((part, index) => (
        <MessagePartRenderer
          key={`${message.id}-${index}`}
          mentionTitles={mentionTitles}
          part={part}
          role={role}
        />
      ))}
    </>
  )
})

function getPlainText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
  )
}

const MessagePartRenderer = memo(function MessagePartRenderer({
  part,
  role,
  mentionTitles,
}: {
  part: UIMessage['parts'][number]
  role: UIMessage['role']
  mentionTitles?: string[]
}) {
  if (part.type === 'text') {
    const text = part.text
    if (role === 'assistant') {
      return <AssistantTextPart text={text} />
    }
    return <UserMessageWithCommandBadges mentionTitles={mentionTitles} text={text} />
  }

  if (isToolUIPart(part)) {
    return <ToolPartBlock part={part} />
  }

  if (part.type === 'source-url') {
    return (
      <p className="text-muted-foreground text-xs">
        <Link
          className="underline underline-offset-2"
          href={part.url}
          rel="noreferrer"
          target="_blank"
        >
          {part.title ?? part.url}
        </Link>
      </p>
    )
  }

  if (part.type === 'source-document') {
    return (
      <p className="text-muted-foreground text-xs">
        {part.title} ({part.mediaType})
      </p>
    )
  }

  if (part.type === 'file') {
    return <p className="text-muted-foreground text-xs">File: {part.filename ?? part.mediaType}</p>
  }

  if (part.type === 'step-start') {
    return <hr className="my-2 border-border" />
  }

  if (part.type.startsWith('data-')) {
    return (
      <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs">
        {JSON.stringify(part, null, 2)}
      </pre>
    )
  }

  return null
})
