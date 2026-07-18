'use client'

import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from '@workspace/ui/components/ai-elements/prompt-input'
import { useTranslations } from 'next-intl'

import {
  CHAT_GATEWAY_MODEL_IDS,
  type ChatGatewayModelId,
  gatewayModelToMessageKey,
} from '@/lib/chat/gateway-chat-models'
import { cn } from '@workspace/ui/lib/utils'

type ChatGatewayModelSelectProps = {
  value: ChatGatewayModelId
  onValueChange: (id: ChatGatewayModelId) => void
  disabled?: boolean
  className?: string
  /** Override the option list (e.g. vision-only subset). Defaults to full chat allowlist. */
  modelIds?: readonly ChatGatewayModelId[]
}

export function ChatGatewayModelSelect({
  value,
  onValueChange,
  disabled,
  className,
  modelIds = CHAT_GATEWAY_MODEL_IDS,
}: ChatGatewayModelSelectProps) {
  const t = useTranslations('chatGatewayModels')
  const allowed = new Set<string>(modelIds)

  return (
    <PromptInputSelect
      disabled={disabled}
      onValueChange={(v) => {
        if (allowed.has(v)) {
          onValueChange(v as ChatGatewayModelId)
        }
      }}
      value={value}
    >
      <PromptInputSelectTrigger
        aria-label={t('ariaLabel')}
        className={cn('max-w-[min(100%,11rem)] min-w-0', className)}
      >
        <PromptInputSelectValue placeholder={t('ariaLabel')} />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {modelIds.map((id) => (
          <PromptInputSelectItem key={id} value={id}>
            {t(gatewayModelToMessageKey(id))}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  )
}
