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

type ChatGatewayModelSelectProps = {
  value: ChatGatewayModelId
  onValueChange: (id: ChatGatewayModelId) => void
  disabled?: boolean
}

export function ChatGatewayModelSelect({
  value,
  onValueChange,
  disabled,
}: ChatGatewayModelSelectProps) {
  const t = useTranslations('chatGatewayModels')

  return (
    <PromptInputSelect
      disabled={disabled}
      onValueChange={(v) => {
        if (CHAT_GATEWAY_MODEL_IDS.includes(v as ChatGatewayModelId)) {
          onValueChange(v as ChatGatewayModelId)
        }
      }}
      value={value}
    >
      <PromptInputSelectTrigger
        aria-label={t('ariaLabel')}
        className="max-w-[min(100%,11rem)] min-w-0"
      >
        <PromptInputSelectValue placeholder={t('ariaLabel')} />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {CHAT_GATEWAY_MODEL_IDS.map((id) => (
          <PromptInputSelectItem key={id} value={id}>
            {t(gatewayModelToMessageKey(id))}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  )
}
