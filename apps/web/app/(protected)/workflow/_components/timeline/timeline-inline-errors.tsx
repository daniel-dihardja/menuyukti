'use client'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'

export const TIMELINE_ERROR_KEYS = [
  'create',
  'delete',
  'move',
  'passCriteria',
  'milestoneData',
  'milestoneRun',
  'milestoneSettings',
  'runChatModel',
  'milestoneRunCriteriaHint',
] as const

export type TimelineErrorKey = (typeof TIMELINE_ERROR_KEYS)[number]

export type TimelineErrorMap = Partial<Record<TimelineErrorKey, string | null | undefined>>

export function TimelineInlineErrors({
  errors,
  show,
}: {
  errors: TimelineErrorMap
  show: boolean
}) {
  if (!show) {
    return null
  }
  return (
    <>
      {TIMELINE_ERROR_KEYS.map((key) => {
        const msg = errors[key]
        if (!msg) {
          return null
        }
        const variant = key === 'milestoneRunCriteriaHint' ? 'default' : 'destructive'
        return (
          <Alert className="rounded-none border-x-0 border-t-0" key={key} variant={variant}>
            <AlertDescription>{msg}</AlertDescription>
          </Alert>
        )
      })}
    </>
  )
}
