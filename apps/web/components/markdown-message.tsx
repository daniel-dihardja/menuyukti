'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@workspace/ui/lib/utils'

export type MarkdownMessageProps = {
  content: string
  className?: string
}

/**
 * Renders assistant markdown (GFM) with typography plugin styles.
 * Uses react-markdown + remark-gfm (not Streamdown) for static / batched text parts.
 */
export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:scroll-mt-20 prose-pre:bg-muted',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
