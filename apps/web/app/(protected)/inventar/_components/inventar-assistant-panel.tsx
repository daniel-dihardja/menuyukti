'use client'

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { ArrowUpIcon, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'
import { isAgentThreadId } from '@/lib/chat/agent-thread-registry'

export const INVENTAR_ASSISTANT_OPEN_ID = 'inventar-assistant-open'

const THREAD_STORAGE_PREFIX = 'menuyukti.inventarChatThread.v1.'

type Props = {
  /** When true, focus the composer (e.g. after open). */
  active: boolean
  onClose: () => void
  /** Selected inventar branch; required to call refill forecast tools. */
  locationId: number | null
  className?: string
  /** Hide the close button when the parent surface already provides one (mobile drawer). */
  showCloseButton?: boolean
}

function messagePlainText(message: UIMessage): string {
  const parts = message.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
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

export function InventarAssistantPanel({
  active,
  onClose,
  locationId,
  className,
  showCloseButton = true,
}: Props) {
  const t = useTranslations('inventar')
  const listId = useId()
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState('')
  const [agentThreadId, setAgentThreadId] = useState<string | null>(null)

  useEffect(() => {
    if (locationId == null) {
      setAgentThreadId(null)
      return
    }
    setAgentThreadId(readOrCreateThreadId(locationId))
  }, [locationId])

  useEffect(() => {
    if (!active) return
    queueMicrotask(() => {
      composerRef.current?.focus()
    })
  }, [active])

  const locationIdRef = useRef(locationId)
  locationIdRef.current = locationId
  const agentThreadIdRef = useRef(agentThreadId)
  agentThreadIdRef.current = agentThreadId

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, body: mergedBody }) => {
          const lastUser = [...messages].reverse().find((m) => m.role === 'user')
          const threadId = agentThreadIdRef.current
          const loc = locationIdRef.current
          return {
            body: {
              ...mergedBody,
              messages: lastUser ? [lastUser] : messages,
              agentThreadId: threadId,
              ...(loc != null ? { locationId: String(loc) } : {}),
              chatMode: 'inventar',
            },
          }
        },
      }),
    [],
  )

  const { messages, sendMessage, status, error, clearError, setMessages } = useChat({
    id: agentThreadId ?? 'inventar-pending',
    transport,
  })

  // Reset in-memory messages when branch / thread changes.
  useEffect(() => {
    setMessages([])
    clearError()
  }, [agentThreadId, setMessages, clearError])

  const busy = status === 'submitted' || status === 'streaming'
  const canSend = locationId != null && agentThreadId != null && !busy

  function send() {
    const text = draft.trim()
    if (!text || !canSend) return
    setDraft('')
    void sendMessage({ text })
  }

  function sendSuggestion(text: string) {
    if (!canSend) return
    setDraft('')
    void sendMessage({ text })
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  const hasUserMessages = messages.some((message) => message.role === 'user')

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

      <ScrollArea className="min-h-0 flex-1">
        <div
          id={listId}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="flex flex-col gap-3 px-3 py-4"
        >
          {locationId == null ? (
            <p className="text-pretty text-sm text-muted-foreground">{t('assistantPickBranch')}</p>
          ) : !hasUserMessages ? (
            <div className="flex flex-col gap-3">
              <p className="text-pretty text-sm text-muted-foreground">{t('assistantWelcome')}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit touch-manipulation"
                disabled={!canSend}
                onClick={() => sendSuggestion(t('assistantSuggestRefill'))}
              >
                {t('assistantSuggestRefill')}
              </Button>
            </div>
          ) : null}
          {messages.map((message) => {
            const content = messagePlainText(message)
            if (!content.trim() && message.role === 'assistant' && busy) {
              return (
                <div
                  key={message.id}
                  className="mr-auto max-w-[92%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
                >
                  {t('assistantThinking')}
                </div>
              )
            }
            if (!content.trim()) return null
            return (
              <div
                key={message.id}
                className={cn(
                  'max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted text-foreground',
                )}
              >
                {content}
              </div>
            )
          })}
          {error ? (
            <p className="text-pretty text-sm text-destructive" role="alert">
              {t('assistantError')}
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={composerRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder={
              locationId == null ? t('assistantPickBranchPlaceholder') : t('assistantPlaceholder')
            }
            disabled={locationId == null || busy}
            rows={2}
            className="min-h-11 resize-none"
            aria-label={t('assistantPlaceholder')}
          />
          <Button
            type="button"
            size="icon"
            className="size-11 shrink-0 touch-manipulation"
            disabled={!canSend || !draft.trim()}
            aria-label={t('assistantSend')}
            onClick={send}
          >
            <ArrowUpIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
