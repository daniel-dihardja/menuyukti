'use client'

import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from '@workspace/ui/components/ai-elements/prompt-input'
import { useTranslations } from 'next-intl'

import { CHAT_MODE_IDS, type ChatModeId } from '@/lib/chat/chat-modes'
import { cn } from '@workspace/ui/lib/utils'

type ChatModeSelectProps = {
  value: ChatModeId
  onValueChange: (id: ChatModeId) => void
  disabled?: boolean
  className?: string
}

/** Trigger chrome so active mode is visible without a separate banner.
 *  PromptInputSelectTrigger uses `border-none` (border-style); override with `border-solid`.
 *  Story mode uses editorial amber (not red) so focus reads as “locked in”, not an error. */
const CHAT_MODE_TRIGGER_CLASS: Record<ChatModeId, string | undefined> = {
  general: undefined,
  story_image_assistant: 'border-2 border-solid border-warning bg-warning/20',
}

export function ChatModeSelect({ value, onValueChange, disabled, className }: ChatModeSelectProps) {
  const t = useTranslations('analytics.workflows.chat.modes')
  const allowed = new Set<string>(CHAT_MODE_IDS)

  return (
    <PromptInputSelect
      disabled={disabled}
      onValueChange={(v) => {
        if (allowed.has(v)) {
          onValueChange(v as ChatModeId)
        }
      }}
      value={value}
    >
      <PromptInputSelectTrigger
        aria-label={t('ariaLabel')}
        className={cn(
          'max-w-[min(100%,9.5rem)] min-w-0 lg:max-w-[min(100%,12rem)]',
          CHAT_MODE_TRIGGER_CLASS[value],
          className,
        )}
      >
        <PromptInputSelectValue placeholder={t('ariaLabel')} />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {CHAT_MODE_IDS.map((id) => (
          <PromptInputSelectItem key={id} value={id}>
            {t(id)}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  )
}
