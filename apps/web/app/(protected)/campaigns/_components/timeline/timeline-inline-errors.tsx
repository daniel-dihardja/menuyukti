'use client'

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
  ]
  return (
    <>
      {messages.map((msg, i) =>
        msg ? (
          <p
            key={ERROR_KEYS[i]}
            className="border-b px-4 py-2 text-destructive text-sm"
            role="alert"
          >
            {msg}
          </p>
        ) : null,
      )}
    </>
  )
}
