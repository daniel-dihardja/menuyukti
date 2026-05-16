'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

import { syncMilestonePreviewSelectionId } from '@/lib/milestones/milestone-preview-selection'

import { milestonePreviewTypography as mp } from './milestone-preview-typography'

export function useMilestonePreviewSelection<TId extends string>(items: readonly { id: TId }[]) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items])
  const [selectedId, setSelectedId] = useState<TId | null>(null)

  useEffect(() => {
    setSelectedId((current) => syncMilestonePreviewSelectionId(current, itemIds))
  }, [itemIds])

  const select = useCallback((id: TId) => {
    setSelectedId(id)
  }, [])

  const clear = useCallback(() => {
    setSelectedId(null)
  }, [])

  return { selectedId, select, clear }
}

export type MilestonePreviewListRowProps = {
  title: string
  description?: string
  meta?: ReactNode
  viewDetailsLabel: string
  onSelect: () => void
}

export function MilestonePreviewListRow({
  title,
  description,
  meta,
  viewDetailsLabel,
  onSelect,
}: MilestonePreviewListRowProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onSelect}
      className={cn(
        'h-auto w-full items-start justify-between gap-3 px-3 py-3 text-left font-normal whitespace-normal shadow-xs',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={mp.sectionTitle}>{title}</span>
        {description ? <span className={mp.bodySmall}>{description}</span> : null}
        {meta ? <span className="flex flex-wrap items-center gap-1">{meta}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1 pt-0.5 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{viewDetailsLabel}</span>
        <span className="sr-only sm:hidden">{viewDetailsLabel}</span>
        <ChevronRight data-icon="inline-end" />
      </span>
    </Button>
  )
}

export type MilestonePreviewListDetailShellProps = {
  selectedId: string | null
  backLabel: string
  detailTitleId: string
  detailTitle: string
  onBack: () => void
  list: ReactNode
  detail: ReactNode
}

export function MilestonePreviewListDetailShell({
  selectedId,
  backLabel,
  detailTitleId,
  detailTitle,
  onBack,
  list,
  detail,
}: MilestonePreviewListDetailShellProps) {
  if (selectedId === null) {
    return <>{list}</>
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit px-2" onClick={onBack}>
        <ArrowLeft data-icon="inline-start" />
        {backLabel}
      </Button>
      <section aria-labelledby={detailTitleId} className="flex flex-col gap-4">
        <h3 id={detailTitleId} className={mp.sectionTitle}>
          {detailTitle}
        </h3>
        {detail}
      </section>
    </div>
  )
}
