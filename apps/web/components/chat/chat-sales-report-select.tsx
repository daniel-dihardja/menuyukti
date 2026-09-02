'use client'

import { useTranslations } from 'next-intl'

import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from '@workspace/ui/components/ai-elements/prompt-input'
import { cn } from '@workspace/ui/lib/utils'

import { useAnalyticsList } from '@/hooks/use-analytics-list'

const NONE_VALUE = 'none'

export type ChatSalesReportSelectProps = {
  locationId: number
  value: number | null
  onValueChange: (analyticsRunId: number | null) => void
  disabled?: boolean
  className?: string
}

export function ChatSalesReportSelect({
  locationId,
  value,
  onValueChange,
  disabled = false,
  className,
}: ChatSalesReportSelectProps) {
  const t = useTranslations('chat.salesReport')
  const { runs } = useAnalyticsList(locationId)

  return (
    <PromptInputSelect
      disabled={disabled}
      onValueChange={(val) => {
        onValueChange(val === NONE_VALUE || !val ? null : Number(val))
      }}
      value={value !== null ? String(value) : NONE_VALUE}
    >
      <PromptInputSelectTrigger
        aria-label={t('ariaLabel')}
        className={cn('max-w-[min(100%,12rem)]', className)}
      >
        <PromptInputSelectValue placeholder={t('placeholder')} />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        <PromptInputSelectItem value={NONE_VALUE}>{t('none')}</PromptInputSelectItem>
        {runs.map((run) => (
          <PromptInputSelectItem key={run.id} value={String(run.id)}>
            {run.name}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  )
}
