'use client'

import type { ReactNode } from 'react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { REWARD_MODE_POINTS, type Prediction } from '@/lib/graphql/queries/predictions'

export type PredictionOutcomeCardLabels = {
  yourPick: string
  voting: string
  rewardSocial: string
  rewardPoints: string
  statusClosed: string
  statusResolved: string
  awaitingResult: string
  youWereCorrect: string
  youWereIncorrect: string
  winnerLabel: string
  voteCount: string
}

type Props = {
  prediction: Prediction
  labels: PredictionOutcomeCardLabels
  /** Optional venue line under the question (customer home). */
  locationLine?: string | null
  /** When set, outcome buttons call this; ignored when voting is locked. */
  onVote?: (outcomeId: number) => void
  /** `${predictionId}:${outcomeId}` while a vote request is in flight. */
  busyKey?: string | null
  /** Extra disable (e.g. auth still loading). */
  voteDisabled?: boolean
  /** Optional content below outcome buttons (e.g. sign-in hint). */
  footer?: ReactNode
}

function statusBadge(status: string, labels: PredictionOutcomeCardLabels) {
  if (status === 'closed') {
    return <Badge variant="outline">{labels.statusClosed}</Badge>
  }
  if (status === 'resolved') {
    return <Badge variant="outline">{labels.statusResolved}</Badge>
  }
  return null
}

export function PredictionOutcomeCard({
  prediction,
  labels,
  locationLine,
  onVote,
  busyKey = null,
  voteDisabled = false,
  footer,
}: Props) {
  const votedOutcomeId = prediction.myVote?.outcomeId ?? null
  const isOpen = prediction.status === 'open'
  const isClosed = prediction.status === 'closed'
  const isResolved = prediction.status === 'resolved'
  const canVote = isOpen && votedOutcomeId == null && !voteDisabled && onVote != null
  const showVoteCount = isClosed || isResolved
  const showAsChips = !isOpen

  const winningId = prediction.winningOutcomeId
  const pickedWinner =
    isResolved && votedOutcomeId != null && winningId != null && votedOutcomeId === winningId
  const pickedLoser =
    isResolved && votedOutcomeId != null && winningId != null && votedOutcomeId !== winningId

  return (
    <li className="rounded-xl border border-card-border bg-card px-3 py-3 text-card-foreground">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">{prediction.question}</p>
        {statusBadge(prediction.status, labels)}
      </div>

      {locationLine ? <p className="mt-1 text-xs text-muted-foreground">{locationLine}</p> : null}

      <p className="mt-1 text-xs text-muted-foreground">
        {prediction.rewardMode === REWARD_MODE_POINTS ? labels.rewardPoints : labels.rewardSocial}
        {showVoteCount ? ` · ${labels.voteCount}` : ''}
      </p>

      {isClosed ? (
        <p className="mt-2 text-xs text-muted-foreground">{labels.awaitingResult}</p>
      ) : null}

      {isResolved && (pickedWinner || pickedLoser) ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {pickedWinner ? labels.youWereCorrect : labels.youWereIncorrect}
        </p>
      ) : null}

      {showAsChips ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {prediction.outcomes.map((outcome) => {
            const selected = votedOutcomeId === outcome.id
            const isWinner = isResolved && winningId === outcome.id
            return (
              <li key={outcome.id} className="rounded-md border border-border px-2 py-1">
                {outcome.label}
                {isWinner ? ' ✓' : ''}
                {selected ? ` · ${labels.yourPick}` : ''}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {prediction.outcomes.map((outcome) => {
            const selected = votedOutcomeId === outcome.id
            const busy = busyKey === `${prediction.id}:${outcome.id}`

            return (
              <Button
                key={outcome.id}
                type="button"
                variant={selected ? 'secondary' : 'outline'}
                className="h-auto min-h-10 justify-start whitespace-normal text-left"
                disabled={!canVote || busyKey != null}
                onClick={() => {
                  if (canVote) onVote(outcome.id)
                }}
              >
                {busy ? labels.voting : outcome.label}
                {selected ? ` · ${labels.yourPick}` : ''}
              </Button>
            )
          })}
        </div>
      )}

      {footer ? <div className="mt-2">{footer}</div> : null}
    </li>
  )
}
