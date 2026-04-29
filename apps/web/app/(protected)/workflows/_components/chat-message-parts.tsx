'use client'

import type { DynamicToolUIPart, ToolUIPart, UIMessage, UITools } from 'ai'
import { isReasoningUIPart, isToolUIPart } from 'ai'
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
import dynamic from 'next/dynamic'

const MarkdownMessage = dynamic(
  () => import('@/components/markdown-message').then((mod) => mod.MarkdownMessage),
  {
    loading: () => <MessageResponse className="text-muted-foreground">...</MessageResponse>,
  },
)

function ToolPartBlock({ part }: { part: ToolUIPart<UITools> | DynamicToolUIPart }) {
  const header =
    part.type === 'dynamic-tool' ? (
      <ToolHeader state={part.state} toolName={part.toolName} type="dynamic-tool" />
    ) : (
      <ToolHeader state={part.state} type={part.type} />
    )

  return (
    <Tool defaultOpen={part.state !== 'output-available'}>
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

export function ChatMessageParts({
  message,
  role,
}: {
  message: UIMessage
  role: UIMessage['role']
}) {
  const parts = message.parts

  if (!parts?.length) {
    const fallback = getPlainText(message)
    if (role === 'assistant') {
      return <MarkdownMessage content={fallback} />
    }
    return <MessageResponse>{fallback}</MessageResponse>
  }

  return (
    <>
      {parts.map((part, index) => (
        <MessagePartRenderer key={`${message.id}-${index}`} part={part} role={role} />
      ))}
    </>
  )
}

function getPlainText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
  )
}

function MessagePartRenderer({
  part,
  role,
}: {
  part: UIMessage['parts'][number]
  role: UIMessage['role']
}) {
  if (part.type === 'text') {
    const text = part.text
    if (role === 'assistant') {
      return <MarkdownMessage content={text} />
    }
    return <MessageResponse>{text}</MessageResponse>
  }

  if (isReasoningUIPart(part)) {
    return (
      <Reasoning isStreaming={part.state === 'streaming'}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    )
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
}
