'use client'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'

export const TIMELINE_ERROR_KEYS = [
  'create',
  'delete',
  'rename',
  'move',
  'passCriteria',
  'goal',
  'milestoneData',
  'milestonePrepare',
  'milestoneRun',
  'export',
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
        return msg ? (
          <Alert className="rounded-none border-x-0 border-t-0" key={key} variant="destructive">
            <AlertDescription>{msg}</AlertDescription>
          </Alert>
        ) : null
      })}
    </>
  )
}
