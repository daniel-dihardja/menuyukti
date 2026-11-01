'use client'

import { CopilotChat } from '@copilotkit/react-core/v2'
import '@copilotkit/react-core/v2/styles.css'
import { XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { AdvisorCopilotKitProvider } from '@/components/chat/copilotkit/advisor-copilotkit-provider'
import { isAgentThreadId } from '@/lib/chat/agent-thread-registry'

const THREAD_STORAGE_PREFIX = 'menuyukti.inventarChatThread.v1.'

type Props = {
  active: boolean
  onClose: () => void
  locationId: number | null
  className?: string
  showCloseButton?: boolean
}

function readOrCreateThreadId(locationId: number): string {
  const key = `${THREAD_STORAGE_PREFIX}${locationId}`
  try {
    const existing = sessionStorage.getItem(key)
    if (existing && isAgentThreadId(existing)) return existing
  } catch {
    /* private mode */
  }
  const id = crypto.randomUUID()
  try {
    sessionStorage.setItem(key, id)
  } catch {
    /* ignore */
  }
  return id
}

/**
 * Inventar refill-forecast assistant on CopilotKit/AG-UI (chatMode=inventar).
 */
export function InventarCopilotPanel({
  active,
  onClose,
  locationId,
  className,
  showCloseButton = true,
}: Props) {
  const t = useTranslations('inventar')
  const [agentThreadId, setAgentThreadId] = useState<string | null>(null)

  useEffect(() => {
    if (locationId == null) {
      setAgentThreadId(null)
      return
    }
    setAgentThreadId(readOrCreateThreadId(locationId))
  }, [locationId])

  return (
    <div className={cn('flex h-full min-h-0 min-w-0 flex-col bg-background', className)}>
      <header className="flex shrink-0 items-start justify-between gap-2 border-b px-3 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight">{t('assistantTitle')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('assistantEmptyHint')}</p>
        </div>
        {showCloseButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 touch-manipulation lg:size-9"
            aria-label={t('assistantCloseAria')}
            onClick={onClose}
          >
            <XIcon aria-hidden className="size-4" />
          </Button>
        ) : null}
      </header>

      {locationId == null || agentThreadId == null ? (
        <p className="p-3 text-pretty text-sm text-muted-foreground">{t('assistantPickBranch')}</p>
      ) : (
        <div className={cn('min-h-0 flex-1', !active && 'pointer-events-none opacity-90')}>
          <AdvisorCopilotKitProvider
            agentThreadId={agentThreadId}
            analyticsRunId={null}
            chatMode="inventar"
            locationId={locationId}
          >
            <CopilotChat
              agentId="advisor"
              className="h-full"
              labels={{
                chatInputPlaceholder: t('assistantPlaceholder'),
              }}
              threadId={agentThreadId}
            />
          </AdvisorCopilotKitProvider>
        </div>
      )}
    </div>
  )
}
