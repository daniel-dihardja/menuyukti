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
  LEONARDO_POST_MODEL_IDS,
  getLeonardoPostModelMessageKey,
  isLeonardoPostModelId,
  type LeonardoPostModelId,
} from '@/lib/posts/leonardo-post-models'
import { cn } from '@workspace/ui/lib/utils'

type LeonardoPostModelSelectProps = {
  value: LeonardoPostModelId
  onValueChange: (id: LeonardoPostModelId) => void
  disabled?: boolean
  className?: string
}

export function LeonardoPostModelSelect({
  value,
  onValueChange,
  disabled,
  className,
}: LeonardoPostModelSelectProps) {
  const t = useTranslations('postCreator.prompt')

  return (
    <PromptInputSelect
      disabled={disabled}
      onValueChange={(v) => {
        if (isLeonardoPostModelId(v)) {
          onValueChange(v)
        }
      }}
      value={value}
    >
      <PromptInputSelectTrigger
        aria-label={t('model.label')}
        className={cn('max-w-[min(100%,11rem)] min-w-0', className)}
      >
        <PromptInputSelectValue placeholder={t('model.label')} />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {LEONARDO_POST_MODEL_IDS.map((id) => (
          <PromptInputSelectItem key={id} value={id}>
            {t(`model.options.${getLeonardoPostModelMessageKey(id)}.name`)}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  )
}
