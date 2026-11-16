'use client'

import { randomUUID, useAgent, UseAgentUpdate, useCopilotKit } from '@copilotkit/react-core/v2'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { CalendarDaysIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

/** Same starter prompts as the pre-CopilotKit empty-state chips. */
const QUICK_PROMPT_KEYS = ['locationOverview', 'weeklyPlan', 'featureTopDishes'] as const

/**
 * Custom empty-state presets for a fresh advisor thread.
 *
 * CopilotKit hides its built-in welcome screen whenever `threadId` is set
 * (`hasExplicitThreadId`), so we render Menuyukti's static prompts ourselves.
 * Shares the same `advisor` agent instance as `CopilotChat`.
 */
export function AdvisorCopilotSuggestions() {
  const t = useTranslations('chat')
  const { copilotkit } = useCopilotKit()
  const { agent, isReady } = useAgent({
    agentId: 'advisor',
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
  })

  const isEmpty = agent.messages.length === 0
  const isBusy = !isReady || agent.isRunning

  const handleSelect = useCallback(
    async (prompt: string) => {
      if (!isReady || agent.isRunning || agent.messages.length > 0) return
      agent.addMessage({
        id: randomUUID(),
        role: 'user',
        content: prompt,
      })
      try {
        await copilotkit.runAgent({ agent })
      } catch (error) {
        console.error('AdvisorCopilotSuggestions: runAgent failed', error)
      }
    },
    [agent, copilotkit, isReady],
  )

  // Wait until the runtime agent is bound so we don't flash presets over a
  // thread that still has history loading.
  if (!isReady || !isEmpty) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-auto p-4 sm:p-8"
    >
      <Empty className="pointer-events-auto min-h-0 max-w-md border-0 bg-background/95 p-4 backdrop-blur-sm sm:p-8">
        <EmptyHeader className="max-w-md">
          <EmptyMedia variant="icon">
            <CalendarDaysIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="text-balance text-xl sm:text-lg">{t('emptyTitle')}</EmptyTitle>
          <EmptyDescription className="text-pretty">{t('emptyDescription')}</EmptyDescription>
          <EmptyDescription className="text-xs">{t('waitHint')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="w-full max-w-md gap-2">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            {QUICK_PROMPT_KEYS.map((key) => (
              <Button
                className="h-11 w-full touch-manipulation justify-start whitespace-normal text-left sm:h-9 sm:w-auto sm:justify-center sm:whitespace-nowrap"
                disabled={isBusy}
                key={key}
                onClick={() => void handleSelect(t(`quickPrompts.${key}.prompt`))}
                size="sm"
                type="button"
                variant="outline"
              >
                {t(`quickPrompts.${key}.label`)}
              </Button>
            ))}
          </div>
        </EmptyContent>
      </Empty>
    </div>
  )
}
