'use client'

import { ChatKit, useChatKit, type SupportedLocale } from '@openai/chatkit-react'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'

import { useAdvisorChatKitShell } from '@/components/chat/chatkit/advisor-chatkit-shell-context'
import { AdvisorChatKitToolbar } from '@/components/chat/chatkit/advisor-chatkit-toolbar'
import { useChatVisualizationsState } from '@/components/chat/visualizations/chat-visualizations-context'
import {
  createAgentThread,
  removeAgentThread,
  touchAgentThread,
} from '@/lib/chat/agent-thread-registry'
import { runChatKitScheduleWidgetAction } from '@/lib/chat/chatkit-schedule-widget-actions'
import { searchAdvisorChatKitEntities } from '@/lib/chat/chatkit-entity-search'
import { apiFetch } from '@/lib/api/client-fetch'

/** ChatKit startScreen prompts only render in the new-thread view (threadId === null). */
const CHATKIT_STARTED_KEY_PREFIX = 'menuyukti.chatkit.started.v1:'

function chatKitStartedKey(agentThreadId: string): string {
  return `${CHATKIT_STARTED_KEY_PREFIX}${agentThreadId}`
}

function hasChatKitStarted(agentThreadId: string): boolean {
  try {
    return localStorage.getItem(chatKitStartedKey(agentThreadId)) === '1'
  } catch {
    return false
  }
}

function markChatKitStarted(agentThreadId: string): void {
  try {
    localStorage.setItem(chatKitStartedKey(agentThreadId), '1')
  } catch {
    /* ignore quota / private mode */
  }
}

function clearChatKitStarted(agentThreadId: string): void {
  try {
    localStorage.removeItem(chatKitStartedKey(agentThreadId))
  } catch {
    /* ignore */
  }
}

function buildChatKitHeaders(shell: {
  agentThreadId: string
  locationId: number
  analyticsRunId: number | null
  chatMode: string
  selectedChatModel: string
  selectedGenerationModel: string
  selectedImageFormat: string
}): HeadersInit {
  const headers: Record<string, string> = {
    'X-Chatkit-Agent-Thread-Id': shell.agentThreadId,
    'X-Chatkit-Location-Id': String(shell.locationId),
    'X-Chatkit-Chat-Mode': shell.chatMode,
    'X-Chatkit-Chat-Model': shell.selectedChatModel,
    'X-Chatkit-Generation-Model': shell.selectedGenerationModel,
    'X-Chatkit-Image-Format': shell.selectedImageFormat,
  }
  if (shell.analyticsRunId != null) {
    headers['X-Chatkit-Analytics-Run-Id'] = String(shell.analyticsRunId)
  }
  return headers
}

export function AdvisorChatKit() {
  const t = useTranslations('chat')
  const tMention = useTranslations('chat.mentionMenu')
  const tViz = useTranslations('chat.visualizations')
  const tSchedule = useTranslations('chatTools.presentWeeklyInstagramSchedule')
  const locale = useLocale()
  const shell = useAdvisorChatKitShell()
  const { addedIds } = useChatVisualizationsState()
  const shellRef = useRef(shell)
  shellRef.current = shell

  const scheduleActionLabels = useMemo(
    () => ({
      weekdays: {
        monday: tSchedule('weekdays.monday'),
        tuesday: tSchedule('weekdays.tuesday'),
        wednesday: tSchedule('weekdays.wednesday'),
        thursday: tSchedule('weekdays.thursday'),
        friday: tSchedule('weekdays.friday'),
        saturday: tSchedule('weekdays.saturday'),
        sunday: tSchedule('weekdays.sunday'),
      },
      formats: {
        story: tSchedule('formats.story'),
        post: tSchedule('formats.post'),
        carousel: tSchedule('formats.carousel'),
        reel: tSchedule('formats.reel'),
      },
      captionLabel: tSchedule('captionLabel'),
      whyLabel: tSchedule('whyLabel'),
    }),
    [tSchedule],
  )

  const visualizationTitles = useMemo(() => {
    const titles: Record<string, string> = {}
    for (const id of addedIds) {
      try {
        titles[id] = tViz(`catalog.${id}.title` as 'catalog.venue_slot_strength_heatmap.title')
      } catch {
        titles[id] = id
      }
    }
    return titles
  }, [addedIds, tViz])

  const starters = useMemo(
    () => [
      {
        label: t('quickPrompts.locationOverview.label'),
        prompt: t('quickPrompts.locationOverview.prompt'),
        icon: 'map-pin' as const,
      },
      {
        label: t('quickPrompts.weeklyPlan.label'),
        prompt: t('quickPrompts.weeklyPlan.prompt'),
        icon: 'calendar' as const,
      },
      {
        label: t('quickPrompts.featureTopDishes.label'),
        prompt: t('quickPrompts.featureTopDishes.prompt'),
        icon: 'sparkle' as const,
      },
      {
        label: t('quickPrompts.storiesAndReels.label'),
        prompt: t('quickPrompts.storiesAndReels.prompt'),
        icon: 'images' as const,
      },
    ],
    [t],
  )

  const chatkitFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const current = shellRef.current
    const headers = new Headers(init?.headers)
    const extra = buildChatKitHeaders(current)
    for (const [key, value] of Object.entries(extra)) {
      headers.set(key, value)
    }
    return fetch(input, { ...init, headers })
  }, [])

  const { control, setThreadId } = useChatKit({
    api: {
      url: '/api/chatkit',
      // From OpenAI Platform → Settings → Security → Domain allowlist
      domainKey:
        process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY?.trim() ||
        'domain_pk_6ade1b2fa4608195ae346b59b3cd6d820fb12f8ebd660945',
      fetch: chatkitFetch,
    },
    locale: locale as SupportedLocale,
    theme: {
      colorScheme: 'light',
      radius: 'soft',
      density: 'compact',
    },
    header: {
      enabled: false,
    },
    history: {
      enabled: false,
    },
    startScreen: {
      greeting: t('emptyTitle'),
      prompts: starters,
    },
    composer: {
      placeholder: t(
        shell.chatMode === 'image_assistant' ? 'placeholderImageAssistant' : 'placeholder',
      ),
      // Device uploads require ChatKit AttachmentStore + matching upload response shape.
      // Media library @-mentions remain available via entities.
      attachments: {
        enabled: false,
      },
      tools: [
        {
          id: 'slash_image',
          label: `/${t('slashCommands.image.label')}`,
          shortLabel: 'Image',
          icon: 'images',
          placeholderOverride: t('placeholderImageAssistant'),
        },
        {
          id: 'slash_story',
          label: `/${t('slashCommands.story.label')}`,
          shortLabel: 'Story',
          icon: 'square-image',
          placeholderOverride: t('placeholderImageAssistant'),
        },
      ],
    },
    commands: {
      enabled: true,
      onSearch: async (query: string) => {
        const q = query.trim().toLowerCase()
        const all = [
          {
            id: 'mode_image',
            label: `/${t('slashCommands.image.label')}`,
            description: t('slashCommands.image.description'),
            icon: 'images' as const,
          },
          {
            id: 'mode_story',
            label: `/${t('slashCommands.story.label')}`,
            description: t('slashCommands.story.description'),
            icon: 'square-image' as const,
          },
        ]
        if (!q) return all
        return all.filter(
          (c) => c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
        )
      },
      onSelect: async (command) => {
        if (command.id === 'mode_image' || command.id === 'mode_story') {
          shellRef.current.setChatMode('image_assistant')
          if (command.id === 'mode_story') {
            shellRef.current.setSelectedImageFormat('story')
          }
        }
      },
    },
    entities: {
      showComposerMenu: true,
      onTagSearch: async (query: string) =>
        searchAdvisorChatKitEntities({
          query,
          attachedVisualizationIds: addedIds,
          visualizationTitles,
          mediaGroupLabel: tMention('mediaGroup'),
          chartsGroupLabel: tMention('visualizationsGroup'),
        }),
    },
    widgets: {
      onAction: async (action) => {
        const result = await runChatKitScheduleWidgetAction(
          {
            type: action.type,
            payload:
              action.payload && typeof action.payload === 'object'
                ? (action.payload as Record<string, unknown>)
                : undefined,
          },
          scheduleActionLabels,
        )
        if (result.kind === 'ignored' || result.kind === 'cancelled') return
        if (!result.ok) {
          toast.error(
            action.type === 'schedule.share' ? tSchedule('shareError') : tSchedule('exportError'),
          )
          return
        }
        if (result.kind === 'exported') toast.success(tSchedule('exportSuccess'))
        if (result.kind === 'shared') toast.success(tSchedule('shareShared'))
        if (result.kind === 'copied') toast.success(tSchedule('shareCopied'))
      },
    },
    // null → ChatKit new-thread view (greeting + preset prompts).
    // After the first turn we reopen the agent UUID so history hydrates.
    initialThread: hasChatKitStarted(shell.agentThreadId) ? shell.agentThreadId : null,
    onThreadChange: ({ threadId }) => {
      if (threadId) {
        markChatKitStarted(threadId)
        touchAgentThread(threadId)
      }
    },
    onResponseEnd: () => {
      // Server maps new ChatKit threads onto X-Chatkit-Agent-Thread-Id.
      markChatKitStarted(shellRef.current.agentThreadId)
    },
    onEffect: ({ name, data }) => {
      if (name === 'story_image_ready') {
        const url = data?.url
        if (typeof url === 'string' && url.trim()) {
          shellRef.current.setLatestStoryImageUrl(url.trim())
        }
      }
    },
    threadItemActions: {
      feedback: false,
      retry: true,
    },
  })

  const handleClearChat = useCallback(() => {
    const nextId = crypto.randomUUID()
    createAgentThread({
      id: nextId,
      locationId: shell.locationId,
      analyticsRunId: shell.analyticsRunId,
    })
    clearChatKitStarted(shell.agentThreadId)
    removeAgentThread(shell.agentThreadId)
    void apiFetch(`/api/chat/history?agentThreadId=${encodeURIComponent(shell.agentThreadId)}`, {
      method: 'DELETE',
    }).catch(() => undefined)
    // Stay on new-thread view so preset prompts return after clear.
    setThreadId(null)
    shell.onThreadRotated?.(nextId)
  }, [shell, setThreadId])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <AdvisorChatKitToolbar onClearChat={handleClearChat} />
      <div className="min-h-0 flex-1 overflow-hidden [&_openai-chatkit]:h-full">
        <ChatKit className="h-full w-full" control={control} />
      </div>
    </div>
  )
}
