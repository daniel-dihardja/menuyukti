'use client'

import { cn } from '@workspace/ui/lib/utils'
import { segmentUserMessageForCommandBadges } from '@/lib/chat/segment-user-message-for-command-badges'

const slashBadgeClass =
  'inline-flex max-w-full items-center rounded-md border border-violet-400/25 bg-gradient-to-b from-violet-50/95 to-violet-100/70 px-2 py-0.5 align-baseline font-mono text-[0.7rem] font-semibold tracking-wide text-violet-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] dark:border-violet-400/20 dark:from-violet-950/55 dark:to-violet-900/35 dark:text-violet-50 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'

const mentionBadgeClass =
  'inline-flex max-w-full items-center rounded-md border border-teal-400/25 bg-gradient-to-b from-teal-50/95 to-emerald-50/75 px-2 py-0.5 align-baseline text-[0.7rem] font-medium tracking-tight text-teal-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] dark:border-teal-400/15 dark:from-teal-950/45 dark:to-emerald-950/30 dark:text-teal-50 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'

export function UserMessageWithCommandBadges({
  text,
  className,
  mentionTitles,
}: {
  text: string
  className?: string
  mentionTitles?: string[]
}) {
  const parts = segmentUserMessageForCommandBadges(text, { mentionTitles })

  return (
    <span
      className={cn(
        'inline-block whitespace-pre-wrap break-words text-sm leading-relaxed',
        className,
      )}
    >
      {parts.map((part, index) => {
        if (part.kind === 'text') {
          return <span key={index}>{part.value}</span>
        }
        if (part.kind === 'slash') {
          return (
            <span key={index} className="mx-0.5 inline align-baseline first:ml-0 last:mr-0">
              <span className={slashBadgeClass} title={part.value}>
                {part.value}
              </span>
            </span>
          )
        }
        return (
          <span key={index} className="mx-0.5 inline align-baseline first:ml-0 last:mr-0">
            <span className={mentionBadgeClass} title={part.value}>
              {part.value}
            </span>
          </span>
        )
      })}
    </span>
  )
}
