'use client'

import { useRenderTool } from '@copilotkit/react-core/v2'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { z } from 'zod'

import { AdvisorCopilotToolStatus } from '@/components/chat/copilotkit/advisor-copilot-tool-status'
import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { useChatVisualizationsState } from '@/components/chat/visualizations/chat-visualizations-context'
import { parseGeneratedImageUrlFromToolOutput } from '@/lib/chat/strip-duplicate-generated-image-markdown'
import { isChatVisualizationId, type ChatVisualizationId } from '@/lib/chat/visualization-ids'

const chartParams = z.object({
  chart_id: z.string().optional(),
  chartId: z.string().optional(),
})

const emptyParams = z.object({}).passthrough()

function resolveChartId(
  parameters: { chart_id?: string; chartId?: string } | undefined,
): string | null {
  const raw = parameters?.chart_id ?? parameters?.chartId
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

function OpenWorkspaceTabOnComplete({
  status,
  tab,
}: {
  status: string
  tab: 'insights' | 'story' | 'cogs'
}) {
  const shell = useAdvisorChatKitShell()
  useEffect(() => {
    if (status !== 'complete') return
    shell.setWorkspaceTab(tab)
    shell.openMobileWorkspace()
  }, [status, tab, shell])
  return null
}

function AttachChartOnComplete({
  status,
  chartId,
}: {
  status: string
  chartId: ChatVisualizationId | null
}) {
  const { addVisualization } = useChatVisualizationsState()
  const shell = useAdvisorChatKitShell()
  const seen = useRef(false)
  useEffect(() => {
    if (status !== 'complete' || !chartId || seen.current) return
    seen.current = true
    addVisualization(chartId)
    shell.setWorkspaceTab('insights')
    shell.openMobileWorkspace()
  }, [status, chartId, addVisualization, shell])
  return null
}

function useCapturedGeneratedImageUrl(status: string, result: string | undefined): string | null {
  const shell = useAdvisorChatKitShell()
  const imageUrl = status === 'complete' ? parseGeneratedImageUrlFromToolOutput(result) : null
  useEffect(() => {
    if (!imageUrl) return
    shell.setLatestStoryImageUrl(imageUrl)
    shell.setWorkspaceTab('story')
    shell.openMobileWorkspace()
  }, [imageUrl, shell])
  return imageUrl
}

/**
 * CopilotKit generative UI for advisor tool calls (TASK-14.6).
 * Replaces ChatKit Card widgets on the CopilotKit path.
 */
export function AdvisorCopilotGenerativeUi() {
  const tChart = useTranslations('chatTools.getChartData')
  const tImage = useTranslations('chatTools.generateInstagramPostImage')
  const tCogs = useTranslations('chat.workspace')
  const tStory = useTranslations('chatTools.requestStoryGenerateConfirmation')
  const tGeneric = useTranslations('chatTools')

  useRenderTool(
    {
      name: 'get_chart_data',
      agentId: 'advisor',
      parameters: chartParams,
      render: ({ status, parameters, result }) => {
        const chartIdRaw = resolveChartId(parameters)
        const chartId = chartIdRaw && isChatVisualizationId(chartIdRaw) ? chartIdRaw : null

        let message: string
        if (status === 'inProgress' || status === 'executing') {
          message = chartId != null ? tChart(`charts.${chartId}.running`) : tChart('runningGeneric')
          return (
            <>
              <AttachChartOnComplete status={status} chartId={chartId} />
              <AdvisorCopilotToolStatus status="running" message={message} />
            </>
          )
        }

        if (typeof result === 'string' && result.toLowerCase().startsWith('error')) {
          return <AdvisorCopilotToolStatus status="error" message={tChart('error')} />
        }

        message = chartId != null ? tChart(`charts.${chartId}.done`) : tChart('doneGeneric')
        return (
          <>
            <AttachChartOnComplete status={status} chartId={chartId} />
            <AdvisorCopilotToolStatus status="done" message={message} />
          </>
        )
      },
    },
    [tChart],
  )

  useRenderTool(
    {
      name: 'list_menu_item_cogs',
      agentId: 'advisor',
      parameters: emptyParams,
      render: ({ status }) => (
        <>
          <OpenWorkspaceTabOnComplete status={status} tab="cogs" />
          <AdvisorCopilotToolStatus
            status={status === 'complete' ? 'done' : 'running'}
            message={tCogs('cogsSectionTitle')}
          />
        </>
      ),
    },
    [tCogs],
  )

  useRenderTool(
    {
      name: 'request_cogs_edit',
      agentId: 'advisor',
      parameters: emptyParams,
      render: ({ status }) => (
        <>
          <OpenWorkspaceTabOnComplete status={status} tab="cogs" />
          <AdvisorCopilotToolStatus
            status={status === 'complete' ? 'done' : 'running'}
            message={
              status === 'complete' ? tCogs('cogsSelectReportHint') : tCogs('cogsSectionTitle')
            }
          />
        </>
      ),
    },
    [tCogs],
  )

  useRenderTool(
    {
      name: 'generate_instagram_post_image',
      agentId: 'advisor',
      parameters: emptyParams,
      render: ({ status, result }) => {
        if (status === 'inProgress' || status === 'executing') {
          return <AdvisorCopilotToolStatus status="running" message={tImage('runningDetail')} />
        }
        if (typeof result === 'string' && result.toLowerCase().startsWith('error')) {
          return <AdvisorCopilotToolStatus status="error" message={tImage('error')} />
        }
        return <GeneratedImageBlock result={result} status={status} tImage={tImage} />
      },
    },
    [tImage],
  )

  useRenderTool(
    {
      name: '*',
      agentId: 'advisor',
      render: ({ name, status }) => {
        if (status === 'complete') return null
        const label =
          name === 'get_location_data'
            ? tGeneric('getLocationData.running')
            : name === 'save_story_asset'
              ? tGeneric('saveStoryAsset.running')
              : name === 'search_web' || name === 'search_knowledge'
                ? `${name}…`
                : tStory('running')
        return <AdvisorCopilotToolStatus status="running" message={label} />
      },
    },
    [tGeneric, tStory],
  )

  return null
}

function GeneratedImageBlock({
  status,
  result,
  tImage,
}: {
  status: string
  result: string | undefined
  tImage: ReturnType<typeof useTranslations<'chatTools.generateInstagramPostImage'>>
}) {
  const imageUrl = useCapturedGeneratedImageUrl(status, result)
  return (
    <div className="flex flex-col gap-2">
      <AdvisorCopilotToolStatus status="done" message={tImage('done')} />
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
        <img
          alt={tImage('imageAlt')}
          className="max-h-80 max-w-full rounded-md border border-border object-contain"
          src={imageUrl}
        />
      ) : null}
    </div>
  )
}
