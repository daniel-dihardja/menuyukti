'use client'

import type { DynamicToolUIPart, ToolUIPart, UIMessage, UITools } from 'ai'
import { isToolUIPart } from 'ai'
import { Reasoning, ReasoningTrigger } from '@workspace/ui/components/ai-elements/reasoning'
import { ReasoningContent } from '@workspace/ui/components/ai-elements/reasoning-content'
import { Shimmer } from '@workspace/ui/components/ai-elements/shimmer'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@workspace/ui/components/ai-elements/tool'
import { Suggestion, Suggestions } from '@workspace/ui/components/ai-elements/suggestion'
import { MessageResponse } from '@workspace/ui/components/ai-elements/message-response'
import { Spinner } from '@workspace/ui/components/spinner'
import { CheckIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { memo, type ReactNode } from 'react'

import {
  isReasoningStreaming,
  joinReasoningText,
  partitionMessageParts,
} from '@/lib/chat/partition-message-parts'
import { isRejectedStoryAssetSaveOutput } from '@/lib/chat/story-assets-from-messages'
import {
  collectGeneratedImageUrlsFromMessages,
  collectGeneratedImageUrlsFromParts,
  messageHasSuccessfulGenerateImageTool,
  parseGeneratedImageUrlFromToolOutput,
  stripDuplicateGeneratedImageMarkdown,
} from '@/lib/chat/strip-duplicate-generated-image-markdown'
import { isChatVisualizationId, type ChatVisualizationId } from '@/lib/chat/visualization-ids'
import { parseWeeklyInstagramScheduleFromToolPart } from '@/lib/chat/weekly-instagram-schedule'
import { UserMessageWithCommandBadges } from '@/components/user-message-with-command-badges'
import { WeeklyInstagramScheduleCard } from '@/components/chat/weekly-instagram-schedule-card'

function resolveToolName(part: ToolUIPart<UITools> | DynamicToolUIPart): string {
  if (part.type === 'dynamic-tool') {
    return part.toolName
  }
  return part.type.split('-').slice(1).join('-')
}

function resolveChartIdFromToolInput(input: unknown): ChatVisualizationId | null {
  if (!input || typeof input !== 'object' || !('chart_id' in input)) {
    return null
  }
  const chartId = (input as { chart_id?: unknown }).chart_id
  return typeof chartId === 'string' && isChatVisualizationId(chartId) ? chartId : null
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

type CompactToolStatusKind = 'running' | 'error' | 'done'

function CompactToolStatus({
  status,
  message,
}: {
  status: CompactToolStatusKind
  message: string
}) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 text-muted-foreground text-sm"
      role="status"
    >
      {status === 'running' ? (
        <Spinner className="size-3.5 shrink-0" />
      ) : status === 'error' ? (
        <XIcon aria-hidden className="size-3.5 shrink-0 text-destructive" />
      ) : (
        <CheckIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      {status === 'running' ? (
        <Shimmer className="text-sm">{message}</Shimmer>
      ) : (
        <span className={status === 'error' ? 'text-destructive' : undefined}>{message}</span>
      )}
    </div>
  )
}

function toolPartStatus(part: ToolUIPart<UITools> | DynamicToolUIPart): CompactToolStatusKind {
  const isInFlight = part.state === 'input-streaming' || part.state === 'input-available'
  if (isInFlight) return 'running'
  if (toolOutputLooksLikeError(part)) return 'error'
  return 'done'
}

function GenerateInstagramPostImageToolBlock({
  part,
}: {
  part: ToolUIPart<UITools> | DynamicToolUIPart
}) {
  const t = useTranslations('chatTools.generateInstagramPostImage')
  const status = toolPartStatus(part)
  const output = 'output' in part ? part.output : undefined
  const imageUrl = status === 'done' ? parseGeneratedImageUrlFromToolOutput(output) : null
  const message =
    status === 'error' ? t('error') : status === 'running' ? t('runningDetail') : t('done')

  return (
    <div className="flex flex-col gap-2">
      <CompactToolStatus status={status} message={message} />
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
  const status = toolPartStatus(part)
  const chartId = resolveChartIdFromToolInput('input' in part ? part.input : undefined)

  let message: string
  if (status === 'error') {
    message = t('error')
  } else if (chartId === 'venue_slot_strength_heatmap') {
    message =
      status === 'running'
        ? t('charts.venue_slot_strength_heatmap.running')
        : t('charts.venue_slot_strength_heatmap.done')
  } else if (chartId === 'menu_item_heatmap') {
    message =
      status === 'running'
        ? t('charts.menu_item_heatmap.running')
        : t('charts.menu_item_heatmap.done')
  } else if (chartId === 'pair_lift_matrix_heatmap') {
    message =
      status === 'running'
        ? t('charts.pair_lift_matrix_heatmap.running')
        : t('charts.pair_lift_matrix_heatmap.done')
  } else {
    message = status === 'running' ? t('runningGeneric') : t('doneGeneric')
  }

  return <CompactToolStatus status={status} message={message} />
}

function PresentWeeklyInstagramScheduleToolBlock({
  part,
}: {
  part: ToolUIPart<UITools> | DynamicToolUIPart
}) {
  const t = useTranslations('chatTools.presentWeeklyInstagramSchedule')
  const isInputStreaming = part.state === 'input-streaming'
  const schedule = parseWeeklyInstagramScheduleFromToolPart({
    input: 'input' in part ? part.input : undefined,
    output: 'output' in part ? part.output : undefined,
  })

  if (toolOutputLooksLikeError(part) && !schedule) {
    return <CompactToolStatus status="error" message={t('error')} />
  }

  if (schedule) {
    return <WeeklyInstagramScheduleCard isStreaming={isInputStreaming} schedule={schedule} />
  }

  if (isInputStreaming || part.state === 'input-available') {
    return <CompactToolStatus status="running" message={t('running')} />
  }

  return <CompactToolStatus status="error" message={t('error')} />
}

const COMPACT_TOOL_I18N = {
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
  const status = toolPartStatus(part)
  const output = 'output' in part ? part.output : undefined
  // Hide rejected speculative saves (invented / unattached names) — avoid alarming the user.
  if (
    toolName === 'save_story_asset' &&
    status !== 'running' &&
    isRejectedStoryAssetSaveOutput(output)
  ) {
    return null
  }
  const message =
    status === 'error'
      ? t(`${key}.error`)
      : status === 'running'
        ? t(`${key}.running`)
        : t(`${key}.done`)

  return <CompactToolStatus status={status} message={message} />
}

export type StoryGenerateConfirmationActions = {
  actionsEnabled: boolean
  onConfirmGenerate: () => void
  onRequestChanges: () => void
}

function StoryGenerateConfirmationActionsBlock({
  confirmation,
}: {
  confirmation: StoryGenerateConfirmationActions
}) {
  const t = useTranslations('chatTools.requestStoryGenerateConfirmation')
  return (
    <Suggestions>
      <Suggestion
        onClick={confirmation.onConfirmGenerate}
        suggestion={t('generate')}
        variant="default"
      />
      <Suggestion onClick={confirmation.onRequestChanges} suggestion={t('change')} />
    </Suggestions>
  )
}

function RequestStoryGenerateConfirmationToolBlock({
  part,
  storyGenerateConfirmation,
}: {
  part: ToolUIPart<UITools> | DynamicToolUIPart
  storyGenerateConfirmation: StoryGenerateConfirmationActions
}) {
  const t = useTranslations('chatTools.requestStoryGenerateConfirmation')
  const status = toolPartStatus(part)
  const actionsEnabled = storyGenerateConfirmation.actionsEnabled && status === 'done'

  if (status === 'running') {
    return <CompactToolStatus status="running" message={t('running')} />
  }

  if (status === 'error') {
    return <CompactToolStatus status="error" message={t('error')} />
  }

  if (!actionsEnabled) {
    return <CompactToolStatus status="done" message={t('done')} />
  }

  return (
    <div className="flex flex-col gap-2">
      <CompactToolStatus status="done" message={t('ready')} />
      <StoryGenerateConfirmationActionsBlock confirmation={storyGenerateConfirmation} />
    </div>
  )
}

type ToolBlockProps = {
  part: ToolUIPart<UITools> | DynamicToolUIPart
  storyGenerateConfirmation?: StoryGenerateConfirmationActions
}

const TOOL_BLOCK_REGISTRY: Record<string, (props: ToolBlockProps) => ReactNode> = {
  search_web: ({ part }) => <SearchWebToolBlock part={part} />,
  generate_instagram_post_image: ({ part }) => <GenerateInstagramPostImageToolBlock part={part} />,
  get_chart_data: ({ part }) => <GetChartDataToolBlock part={part} />,
  present_weekly_instagram_schedule: ({ part }) => (
    <PresentWeeklyInstagramScheduleToolBlock part={part} />
  ),
  request_story_generate_confirmation: ({ part, storyGenerateConfirmation }) => {
    // Omit confirmation prop → don't render this tool UI (e.g. generate already ran).
    if (!storyGenerateConfirmation) return null
    return (
      <RequestStoryGenerateConfirmationToolBlock
        part={part}
        storyGenerateConfirmation={storyGenerateConfirmation}
      />
    )
  },
}

function ToolPartBlock({ part, storyGenerateConfirmation }: ToolBlockProps) {
  const toolName = resolveToolName(part)
  const registered = TOOL_BLOCK_REGISTRY[toolName]
  if (registered) {
    return registered({ part, storyGenerateConfirmation })
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
  threadMessages,
}: {
  message: UIMessage
  role: UIMessage['role']
  /** When set, multi-word `@Milestone title` spans match these titles (campaign chat). */
  mentionTitles?: string[]
  /** When true, assistant text uses incremental Streamdown rendering. */
  isStreaming?: boolean
  /** Story Phase 3 Generate / Change buttons (workflow chat only). */
  storyGenerateConfirmation?: StoryGenerateConfirmationActions
  /**
   * Full visible thread — used so follow-up assistant text that pastes a generated
   * image URL is stripped even when the tool part lived on an earlier message.
   */
  threadMessages?: readonly UIMessage[]
}) {
  const parts = message.parts

  if (!parts?.length) {
    const fallback = getPlainText(message)
    if (role === 'assistant') {
      const urls =
        threadMessages && threadMessages.length > 0
          ? collectGeneratedImageUrlsFromMessages(threadMessages)
          : []
      const stripped = stripDuplicateGeneratedImageMarkdown(fallback, urls, {
        stripAllImageEmbeds: messageHasSuccessfulGenerateImageTool(message),
      })
      if (!stripped) return null
      return <AssistantTextPart text={stripped} />
    }
    return <UserMessageWithCommandBadges mentionTitles={mentionTitles} text={fallback} />
  }

  const { reasoningParts, otherParts } = partitionMessageParts(parts)
  const reasoningText = joinReasoningText(reasoningParts)
  const reasoningStreaming = isReasoningStreaming(reasoningParts, isStreaming)
  const generatedImageUrlsFromMessage = collectGeneratedImageUrlsFromParts(parts)
  const generatedImageUrls =
    threadMessages && threadMessages.length > 0
      ? collectGeneratedImageUrlsFromMessages(threadMessages)
      : generatedImageUrlsFromMessage
  const stripAllImageEmbeds = messageHasSuccessfulGenerateImageTool(message)

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
          stripAllImageEmbeds={stripAllImageEmbeds}
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
  stripAllImageEmbeds = false,
  storyGenerateConfirmation,
}: {
  part: UIMessage['parts'][number]
  role: UIMessage['role']
  mentionTitles?: string[]
  /** URLs from generate_instagram_post_image tool results in this thread. */
  generatedImageUrls?: readonly string[]
  /** Drop every markdown/HTML image when this message already shows the tool thumbnail. */
  stripAllImageEmbeds?: boolean
  storyGenerateConfirmation?: StoryGenerateConfirmationActions
}) {
  if (part.type === 'text') {
    const text =
      role === 'assistant' && (generatedImageUrls.length > 0 || stripAllImageEmbeds)
        ? stripDuplicateGeneratedImageMarkdown(part.text, generatedImageUrls, {
            stripAllImageEmbeds,
          })
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
