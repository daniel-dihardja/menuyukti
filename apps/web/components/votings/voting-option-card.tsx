'use client'

import type { ReactNode } from 'react'

import { Button } from '@workspace/ui/components/button'
import { type Voting } from '@/lib/graphql/queries/votings'

export type VotingOptionCardLabels = {
  yourPick: string
  voting: string
  rewardPoints: string
  thanks: string
}

type Props = {
  voting: Voting
  labels: VotingOptionCardLabels
  /** Optional venue line under the question (customer home). */
  locationLine?: string | null
  /** When set, option buttons call this; ignored when voting is locked. */
  onVote?: (optionId: number) => void
  /** `${votingId}:${optionId}` while a vote request is in flight. */
  busyKey?: string | null
  /** Extra disable (e.g. auth still loading). */
  voteDisabled?: boolean
  /** Optional content below option buttons (e.g. sign-in hint). */
  footer?: ReactNode
}

export function VotingOptionCard({
  voting,
  labels,
  locationLine,
  onVote,
  busyKey = null,
  voteDisabled = false,
  footer,
}: Props) {
  const votedOptionId = voting.myVote?.optionId ?? null
  const hasVoted = votedOptionId != null
  const isOpen = voting.status === 'open'
  const canVote = isOpen && !hasVoted && !voteDisabled && onVote != null
  const pickedLabel =
    hasVoted && votedOptionId != null
      ? voting.options.find((option) => option.id === votedOptionId)?.label
      : null

  // Closed (and legacy resolved) votings are hidden by the API; keep a no-op guard.
  if (!isOpen) {
    return null
  }

  return (
    <li className="rounded-xl border border-card-border bg-card px-3 py-3 text-card-foreground">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">{voting.question}</p>
      </div>

      {locationLine ? <p className="mt-1 text-xs text-muted-foreground">{locationLine}</p> : null}

      <p className="mt-1 text-xs text-muted-foreground">{labels.rewardPoints}</p>

      {hasVoted ? (
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium">{labels.thanks}</p>
          {pickedLabel ? (
            <p className="text-xs text-muted-foreground">
              {labels.yourPick}: {pickedLabel}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {voting.options.map((option) => {
            const busy = busyKey === `${voting.id}:${option.id}`

            return (
              <Button
                key={option.id}
                type="button"
                variant="outline"
                className="h-auto min-h-10 justify-start whitespace-normal text-left"
                disabled={!canVote || busyKey != null}
                onClick={() => {
                  if (canVote) onVote(option.id)
                }}
              >
                {busy ? labels.voting : option.label}
              </Button>
            )
          })}
        </div>
      )}

      {footer && !hasVoted ? <div className="mt-2">{footer}</div> : null}
    </li>
  )
}
