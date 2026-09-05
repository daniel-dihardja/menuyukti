'use client'

import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from '@workspace/ui/components/ai-elements/prompt-input'
import { useTranslations } from 'next-intl'

import { ADVISOR_CHAT_MODE_IDS, type AdvisorChatModeId, type ChatModeId } from '@/lib/chat/chat-modes'
import { cn } from '@workspace/ui/lib/utils'

type ChatModeSelectProps = {
  value: ChatModeId
  onValueChange: (id: ChatModeId) => void
  disabled?: boolean
  className?: string
}

/** Trigger chrome so active mode is visible without a separate banner.
 *  PromptInputSelectTrigger uses `border-none` (border-style); override with `border-solid`.
 *  Image assistant uses editorial amber (not red) so focus reads as “locked in”, not an error. */
const CHAT_MODE_TRIGGER_CLASS: Partial<Record<ChatModeId, string | undefined>> = {
  general: undefined,
  image_assistant: 'border-2 border-solid border-warning bg-warning/20',
}

export function ChatModeSelect({ value, onValueChange, disabled, className }: ChatModeSelectProps) {
  const t = useTranslations('analytics.workflows.chat.modes')
  const allowed = new Set<string>(ADVISOR_CHAT_MODE_IDS)
  const selectValue: AdvisorChatModeId = allowed.has(value)
    ? (value as AdvisorChatModeId)
    : 'general'

  return (
    <PromptInputSelect
      disabled={disabled}
      onValueChange={(v) => {
        if (allowed.has(v)) {
          onValueChange(v as ChatModeId)
        }
      }}
      value={selectValue}
    >
      <PromptInputSelectTrigger
        aria-label={t('ariaLabel')}
        className={cn(
          'max-w-[min(100%,9.5rem)] min-w-0 lg:max-w-[min(100%,12rem)]',
          CHAT_MODE_TRIGGER_CLASS[selectValue],
          className,
        )}
      >
        <PromptInputSelectValue placeholder={t('ariaLabel')} />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {ADVISOR_CHAT_MODE_IDS.map((id) => (
          <PromptInputSelectItem key={id} value={id}>
            {t(id)}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  )
}
