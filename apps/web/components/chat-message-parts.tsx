'use client'

import type { DynamicToolUIPart, ToolUIPart, UIMessage, UITools } from 'ai'
import { isToolUIPart } from 'ai'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@workspace/ui/components/ai-elements/reasoning'
import { Shimmer } from '@workspace/ui/components/ai-elements/shimmer'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@workspace/ui/components/ai-elements/tool'
import { Suggestion, Suggestions } from '@workspace/ui/components/ai-elements/suggestion'
import { MessageResponse } from '@workspace/ui/components/ai-elements/message'
import { Spinner } from '@workspace/ui/components/spinner'
import { CheckIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { memo } from 'react'

import {
  isReasoningStreaming,
  joinReasoningText,
  partitionMessageParts,
} from '@/lib/chat/partition-message-parts'
import {
  parseGeneratedImageUrlFromToolOutput,
  stripDuplicateGeneratedImageMarkdown,
} from '@/lib/chat/strip-duplicate-generated-image-markdown'
import {
  isWorkflowVisualizationId,
  type WorkflowVisualizationId,
} from '@/lib/workflow/workflow-visualization-ids'
import { UserMessageWithCommandBadges } from '@/components/user-message-with-command-badges'

function resolveToolName(part: ToolUIPart<UITools> | DynamicToolUIPart): string {
  if (part.type === 'dynamic-tool') {
    return part.toolName
  }
  return part.type.split('-').slice(1).join('-')
}

function resolveChartIdFromToolInput(input: unknown): WorkflowVisualizationId | null {
  if (!input || typeof input !== 'object' || !('chart_id' in input)) {
    return null
  }
  const chartId = (input as { chart_id?: unknown }).chart_id
  return typeof chartId === 'string' && isWorkflowVisualizationId(chartId) ? chartId : null
}

function toolOutputLooksLikeError(part: ToolUIPart<UITools> | DynamicToolUIPart): boolean {
  if (part.state === 'output-error' || part.state === 'output-denied') {
    return true
  }
  if (!('output' in part) || part.output == null) {
    return false
  }
  const output = typeof part.output === 'string' ? part.output : JSON.stringify(part.output)
  if (/"ok"\s*:\s*false/.test(output)) {
    return true
  }
  return output.startsWith('Error')
}

function SearchWebToolBlock({ part }: { part: ToolUIPart<UITools> | DynamicToolUIPart }) {
  const t = useTranslations('chatTools.searchWeb')
  const isInFlight = part.state === 'input-streaming' || part.state === 'input-available'
  const title = isInFlight ? t('running') : t('done')

  const header =
    part.type === 'dynamic-tool' ? (
      <ToolHeader state={part.state} title={title} toolName={part.toolName} type="dynamic-tool" />
    ) : (
      <ToolHeader state={part.state} title={title} type={part.type} />
    )

  return (
    <Tool defaultOpen={isInFlight}>
      {header}
      {isInFlight ? (
        <ToolContent>
          <Shimmer className="text-sm">{t('runningDetail')}</Shimmer>
        </ToolContent>
      ) : null}
    </Tool>
  )
}

function collectGeneratedImageUrlsFromParts(parts: UIMessage['parts'] | undefined): string[] {
  if (!parts?.length) return []
  const urls: string[] = []
  for (const part of parts) {
    if (!isToolUIPart(part)) continue
    const toolName = resolveToolName(part)
    if (toolName !== 'generate_instagram_post_image') continue
    if (!('output' in part) || part.output == null) continue
    const url = parseGeneratedImageUrlFromToolOutput(part.output)
    if (url) urls.push(url)
  }
  return urls
}

function CompactToolStatus({
  isInFlight,
  isError,
  message,
}: {
  isInFlight: boolean
  isError: boolean
  message: string
}) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 text-muted-foreground text-sm"
      role="status"
    >
      {isInFlight ? (
        <Spinner className="size-3.5 shrink-0" />
      ) : isError ? (
        <XIcon aria-hidden className="size-3.5 shrink-0 text-destructive" />
      ) : (
        <CheckIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      {isInFlight ? (
        <Shimmer className="text-sm">{message}</Shimmer>
      ) : (
        <span className={isError ? 'text-destructive' : undefined}>{message}</span>
      )}
    </div>
  )
}

function GenerateInstagramPostImageToolBlock({
  part,
}: {
  part: ToolUIPart<UITools> | DynamicToolUIPart
}) {
  const t = useTranslations('chatTools.generateInstagramPostImage')
  const isInFlight = part.state === 'input-streaming' || part.state === 'input-available'
  const isError = toolOutputLooksLikeError(part)
  const output = 'output' in part ? part.output : undefined
  const imageUrl = !isInFlight && !isError ? parseGeneratedImageUrlFromToolOutput(output) : null
  const message = isError ? t('error') : isInFlight ? t('runningDetail') : t('done')

  return (
    <div className="flex flex-col gap-2">
      <CompactToolStatus isError={isError} isInFlight={isInFlight} message={message} />
      {imageUrl ? (
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
          <img
            alt={t('imageAlt')}
            className="max-h-80 max-w-full rounded-md border border-border object-contain"
            src={imageUrl}
          />
        </div>
      ) : null}
    </div>
  )
}

function GetChartDataToolBlock({ part }: { part: ToolUIPart<UITools> | DynamicToolUIPart }) {
  const t = useTranslations('chatTools.getChartData')
  const isInFlight = part.state === 'input-streaming' || part.state === 'input-available'
  const isError = toolOutputLooksLikeError(part)
  const chartId = resolveChartIdFromToolInput('input' in part ? part.input : undefined)

  let message: string
  if (isError) {
    message = t('error')
  } else if (chartId === 'venue_slot_strength_heatmap') {
    message = isInFlight
      ? t('charts.venue_slot_strength_heatmap.running')
      : t('charts.venue_slot_strength_heatmap.done')
  } else if (chartId === 'menu_item_heatmap') {
    message = isInFlight
      ? t('charts.menu_item_heatmap.running')
      : t('charts.menu_item_heatmap.done')
  } else if (chartId === 'pair_lift_matrix_heatmap') {
    message = isInFlight
      ? t('charts.pair_lift_matrix_heatmap.running')
      : t('charts.pair_lift_matrix_heatmap.done')
  } else {
    message = isInFlight ? t('runningGeneric') : t('doneGeneric')
  }

  return <CompactToolStatus isError={isError} isInFlight={isInFlight} message={message} />
}

const COMPACT_TOOL_I18N = {
  list_instagram_items: 'listInstagramItems',
  get_instagram_item: 'getInstagramItem',
  create_instagram_items: 'createInstagramItems',
  update_instagram_items: 'updateInstagramItems',
  delete_instagram_items: 'deleteInstagramItems',
  get_workflow_overview: 'getWorkflowOverview',
  get_milestone: 'getMilestone',
  update_milestone_input: 'updateMilestoneInput',
  get_location_data: 'getLocationData',
  save_story_asset: 'saveStoryAsset',
  clear_story_assets: 'clearStoryAssets',
} as const

type CompactToolName = keyof typeof COMPACT_TOOL_I18N

function isCompactToolName(toolName: string): toolName is CompactToolName {
  return toolName in COMPACT_TOOL_I18N
}

function CompactNamedToolBlock({
  part,
  toolName,
}: {
  part: ToolUIPart<UITools> | DynamicToolUIPart
  toolName: CompactToolName
}) {
  const t = useTranslations('chatTools')
  const key = COMPACT_TOOL_I18N[toolName]
  const isInFlight = part.state === 'input-streaming' || part.state === 'input-available'
  const isError = toolOutputLooksLikeError(part)
  const message = isError ? t(`${key}.error`) : isInFlight ? t(`${key}.running`) : t(`${key}.done`)

  return <CompactToolStatus isError={isError} isInFlight={isInFlight} message={message} />
}

export type StoryGenerateConfirmationActions = {
  actionsEnabled: boolean
  /** When true, hide the confirmation tool UI entirely (e.g. generate already ran). */
  hideToolUi?: boolean
  onConfirmGenerate: () => void
  onRequestChanges: () => void
}

function RequestStoryGenerateConfirmationToolBlock({
  part,
  storyGenerateConfirmation,
}: {
  part: ToolUIPart<UITools> | DynamicToolUIPart
  storyGenerateConfirmation?: StoryGenerateConfirmationActions
}) {
  const t = useTranslations('chatTools.requestStoryGenerateConfirmation')
  const isInFlight = part.state === 'input-streaming' || part.state === 'input-available'
  const isError = toolOutputLooksLikeError(part)
  const actionsEnabled =
    Boolean(storyGenerateConfirmation?.actionsEnabled) && !isInFlight && !isError

  if (storyGenerateConfirmation?.hideToolUi) {
    return null
  }

  if (isInFlight) {
    return <CompactToolStatus isError={false} isInFlight message={t('running')} />
  }

  if (isError) {
    return <CompactToolStatus isError isInFlight={false} message={t('error')} />
  }

  if (!actionsEnabled) {
    return <CompactToolStatus isError={false} isInFlight={false} message={t('done')} />
  }

  return (
    <div className="flex flex-col gap-2">
      <CompactToolStatus isError={false} isInFlight={false} message={t('ready')} />
      <Suggestions>
        <Suggestion
          onClick={() => storyGenerateConfirmation?.onConfirmGenerate()}
          suggestion={t('generate')}
          variant="default"
        />
        <Suggestion
          onClick={() => storyGenerateConfirmation?.onRequestChanges()}
          suggestion={t('change')}
        />
      </Suggestions>
    </div>
  )
}

function ToolPartBlock({
  part,
  storyGenerateConfirmation,
}: {
  part: ToolUIPart<UITools> | DynamicToolUIPart
  storyGenerateConfirmation?: StoryGenerateConfirmationActions
}) {
  const toolName = resolveToolName(part)
  if (toolName === 'search_web') {
    return <SearchWebToolBlock part={part} />
  }
  if (toolName === 'generate_instagram_post_image') {
    return <GenerateInstagramPostImageToolBlock part={part} />
  }
  if (toolName === 'get_chart_data') {
    return <GetChartDataToolBlock part={part} />
  }
  if (toolName === 'request_story_generate_confirmation') {
    return (
      <RequestStoryGenerateConfirmationToolBlock
        part={part}
        storyGenerateConfirmation={storyGenerateConfirmation}
      />
    )
  }
  if (isCompactToolName(toolName)) {
    return <CompactNamedToolBlock part={part} toolName={toolName} />
  }

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
  storyGenerateConfirmation,
}: {
  message: UIMessage
  role: UIMessage['role']
  /** When set, multi-word `@Milestone title` spans match these titles (campaign chat). */
  mentionTitles?: string[]
  /** When true, assistant text uses incremental Streamdown rendering. */
  isStreaming?: boolean
  /** Story Phase 3 Generate / Change buttons (workflow chat only). */
  storyGenerateConfirmation?: StoryGenerateConfirmationActions
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
  const generatedImageUrls = collectGeneratedImageUrlsFromParts(parts)

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
          generatedImageUrls={generatedImageUrls}
          key={`${message.id}-${index}`}
          mentionTitles={mentionTitles}
          part={part}
          role={role}
          storyGenerateConfirmation={storyGenerateConfirmation}
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
  generatedImageUrls = [],
  storyGenerateConfirmation,
}: {
  part: UIMessage['parts'][number]
  role: UIMessage['role']
  mentionTitles?: string[]
  /** URLs from generate_instagram_post_image tool results in this message. */
  generatedImageUrls?: readonly string[]
  storyGenerateConfirmation?: StoryGenerateConfirmationActions
}) {
  if (part.type === 'text') {
    const text =
      role === 'assistant' && generatedImageUrls.length > 0
        ? stripDuplicateGeneratedImageMarkdown(part.text, generatedImageUrls)
        : part.text
    if (!text) {
      return null
    }
    if (role === 'assistant') {
      return <AssistantTextPart text={text} />
    }
    return <UserMessageWithCommandBadges mentionTitles={mentionTitles} text={text} />
  }

  if (isToolUIPart(part)) {
    return <ToolPartBlock part={part} storyGenerateConfirmation={storyGenerateConfirmation} />
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
    const isImage =
      typeof part.mediaType === 'string' && part.mediaType.startsWith('image/') && Boolean(part.url)
    if (isImage) {
      return (
        <figure className="my-1 max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element -- chat attachment preview */}
          <img
            alt={part.filename ?? 'Attached image'}
            className="max-h-48 rounded-md border border-border object-contain"
            src={part.url}
          />
          {part.filename ? (
            <figcaption className="mt-1 truncate text-muted-foreground text-xs">
              {part.filename}
            </figcaption>
          ) : null}
        </figure>
      )
    }
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
