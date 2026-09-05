'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUpIcon, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

export const INVENTAR_ASSISTANT_OPEN_ID = 'inventar-assistant-open'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

type Props = {
  /** When true, focus the composer (e.g. after open). */
  active: boolean
  onClose: () => void
  className?: string
  /** Hide the close button when the parent surface already provides one (mobile drawer). */
  showCloseButton?: boolean
}

export function InventarAssistantPanel({
  active,
  onClose,
  className,
  showCloseButton = true,
}: Props) {
  const t = useTranslations('inventar')
  const listId = useId()
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const nextIdRef = useRef(0)

  useEffect(() => {
    if (!active) return
    queueMicrotask(() => {
      composerRef.current?.focus()
    })
  }, [active])

  function appendMessage(role: ChatRole, content: string) {
    nextIdRef.current += 1
    const id = `${role}-${nextIdRef.current}`
    setMessages((prev) => [...prev, { id, role, content }])
  }

  function send() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    appendMessage('user', text)
    appendMessage('assistant', t('assistantStubReply'))
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
          {!hasUserMessages ? (
            <p className="text-pretty text-sm text-muted-foreground">{t('assistantWelcome')}</p>
          ) : null}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'mr-auto bg-muted text-foreground',
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form
        className="flex shrink-0 items-end gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <Textarea
          ref={composerRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onComposerKeyDown}
          placeholder={t('assistantPlaceholder')}
          rows={1}
          className="min-h-11 max-h-32 flex-1 resize-none touch-manipulation"
          aria-label={t('assistantPlaceholder')}
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0 touch-manipulation lg:size-9"
          disabled={!draft.trim()}
          aria-label={t('assistantSend')}
        >
          <ArrowUpIcon aria-hidden className="size-4" />
        </Button>
      </form>
    </div>
  )
}
