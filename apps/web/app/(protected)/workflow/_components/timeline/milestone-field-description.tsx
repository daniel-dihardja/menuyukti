'use client'

import { MarkdownMessage } from '@/components/markdown-message'
import { cn } from '@workspace/ui/lib/utils'

const milestoneFieldDescriptionClassName = cn(
  'text-muted-foreground text-sm leading-normal font-normal',
  'prose prose-sm max-w-none dark:prose-invert',
  'prose-p:my-0 prose-p:leading-normal prose-strong:font-medium prose-strong:text-foreground/90',
  '[&_p+p]:mt-1',
)

export type MilestoneFieldDescriptionProps = {
  content: string
  className?: string
}

/** Renders milestone Input tab copy that may include GFM (e.g. **preset** names). */
export function MilestoneFieldDescription({ content, className }: MilestoneFieldDescriptionProps) {
  return (
    <div data-slot="field-description" className={cn('min-w-0', className)}>
      <MarkdownMessage className={milestoneFieldDescriptionClassName} content={content} />
    </div>
  )
}
