'use client'

import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@workspace/ui/lib/utils'

export type AiFlowSelectOptionProps = {
  displayName: string
  category: string
  showIcon?: boolean
  className?: string
}

function categoryTranslationKey(category: string): string {
  return category.trim().toLowerCase()
}

export function AiFlowSelectOption({
  displayName,
  category,
  showIcon = true,
  className,
}: AiFlowSelectOptionProps) {
  const tCategory = useTranslations('assets.flow.category')
  const categoryKey = categoryTranslationKey(category)
  const categoryLabel = tCategory(categoryKey as 'ai')

  return (
    <span className={cn('flex w-full items-center gap-2', className)}>
      {showIcon ? <Sparkles className="size-4 shrink-0 text-primary" aria-hidden /> : null}
      <span className="flex-1 truncate">{displayName}</span>
      <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-primary">
        {categoryLabel}
      </span>
    </span>
  )
}
