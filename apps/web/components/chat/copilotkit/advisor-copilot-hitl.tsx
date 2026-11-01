'use client'

import { useHumanInTheLoop, useInterrupt } from '@copilotkit/react-core/v2'
import { useTranslations } from 'next-intl'
import { Button } from '@workspace/ui/components/button'

import { AdvisorCopilotToolStatus } from '@/components/chat/copilotkit/advisor-copilot-tool-status'
import {
  STORY_GENERATE_CHANGE_REPLY,
  STORY_GENERATE_CONFIRM_REPLY,
} from '@/lib/chat/story-generate-confirmation'

type StoryInterruptValue = {
  kind?: string
  message?: string
}

function isStoryGenerateInterrupt(value: unknown): value is StoryInterruptValue {
  if (!value || typeof value !== 'object') return false
  const kind = (value as StoryInterruptValue).kind
  return kind === 'story_generate_confirmation'
}

/**
 * Story generate confirmation HITL for CopilotKit (TASK-14.7).
 *
 * Primary path: LangGraph ``interrupt`` via AG-UI + ``useInterrupt`` (pauses the run).
 * Secondary: ``useHumanInTheLoop`` registers the same UX for frontend-tool routing
 * so TASK-8.4 can reuse this primitive when Image Assistant returns.
 *
 * Cancel/Change leaves the thread resumable (tool returns change_requested; operator
 * can continue the conversation).
 */
export function AdvisorCopilotHitl() {
  const t = useTranslations('chatTools.requestStoryGenerateConfirmation')

  useInterrupt({
    agentId: 'advisor',
    enabled: (event) => isStoryGenerateInterrupt(event.value),
    render: ({ resolve, cancel, event }) => {
      const message =
        isStoryGenerateInterrupt(event.value) && event.value.message
          ? event.value.message
          : t('ready')
      return (
        <div className="flex flex-col gap-2" data-testid="advisor-copilot-story-hitl">
          <AdvisorCopilotToolStatus status="done" message={message} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              onClick={() => {
                void resolve({ action: 'generate', reply: STORY_GENERATE_CONFIRM_REPLY })
              }}
            >
              {t('generate')}
            </Button>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => {
                void resolve({ action: 'change', reply: STORY_GENERATE_CHANGE_REPLY })
              }}
            >
              {t('change')}
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                void cancel()
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )
    },
  })

  useHumanInTheLoop(
    {
      name: 'request_story_generate_confirmation',
      description: 'Ask the operator to confirm Story image generation (Generate / Change).',
      agentId: 'advisor',
      render: ({ status, respond }) => {
        if (status === 'complete') {
          return <AdvisorCopilotToolStatus status="done" message={t('done')} />
        }
        if (status === 'inProgress' || !respond) {
          return <AdvisorCopilotToolStatus status="running" message={t('running')} />
        }
        return (
          <div className="flex flex-col gap-2" data-testid="advisor-copilot-story-hitl-frontend">
            <AdvisorCopilotToolStatus status="done" message={t('ready')} />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  void respond({
                    action: 'generate',
                    reply: STORY_GENERATE_CONFIRM_REPLY,
                  })
                }}
              >
                {t('generate')}
              </Button>
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => {
                  void respond({
                    action: 'change',
                    reply: STORY_GENERATE_CHANGE_REPLY,
                  })
                }}
              >
                {t('change')}
              </Button>
            </div>
          </div>
        )
      },
    },
    [t],
  )

  return null
}
