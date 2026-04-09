'use client'

import { Alert, AlertDescription } from '@workspace/ui/components/alert'

const ERROR_KEYS = [
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

export function TimelineInlineErrors({
  show,
  createError,
  deleteError,
  renameError,
  moveError,
  passCriteriaError,
  goalError,
  milestoneDataError,
  milestonePrepareError,
  milestoneRunError,
  exportError,
}: {
  show: boolean
  createError?: string | null
  deleteError?: string | null
  renameError?: string | null
  moveError?: string | null
  passCriteriaError?: string | null
  goalError?: string | null
  milestoneDataError?: string | null
  milestonePrepareError?: string | null
  milestoneRunError?: string | null
  exportError?: string | null
}) {
  if (!show) {
    return null
  }
  const messages = [
    createError,
    deleteError,
    renameError,
    moveError,
    passCriteriaError,
    goalError,
    milestoneDataError,
    milestonePrepareError,
    milestoneRunError,
    exportError,
  ]
  return (
    <>
      {messages.map((msg, i) =>
        msg ? (
          <Alert
            className="rounded-none border-x-0 border-t-0"
            key={ERROR_KEYS[i]}
            variant="destructive"
          >
            <AlertDescription>{msg}</AlertDescription>
          </Alert>
        ) : null,
      )}
    </>
  )
}
