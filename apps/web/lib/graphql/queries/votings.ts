/** Voting service GraphQL documents. */

export const REWARD_MODE_POINTS = 'points' as const

export type VotingRewardMode = typeof REWARD_MODE_POINTS

export type VotingOption = {
  id: number
  label: string
  sortOrder: number
}

export type VotingVote = {
  id: number
  optionId: number
  clerkUserId: string
  createdAt: string
}

export type Voting = {
  id: number
  locationId: number
  locationName: string
  question: string
  status: string
  closesAt: string | null
  rewardMode: string
  pointsForVote: number
  pointsForCorrect: number
  winningOptionId: number | null
  createdAt: string
  resolvedAt: string | null
  options: VotingOption[]
  myVote: VotingVote | null
  voteCount: number
}

const VOTING_FIELDS = `
  id
  locationId
  locationName
  question
  status
  closesAt
  rewardMode
  pointsForVote
  pointsForCorrect
  winningOptionId
  createdAt
  resolvedAt
  options {
    id
    label
    sortOrder
  }
  myVote {
    id
    optionId
    clerkUserId
    createdAt
  }
  voteCount
`

export const VOTINGS_QUERY = `
  query Votings($locationId: Int!) {
    votings(locationId: $locationId) {
      ${VOTING_FIELDS}
    }
  }
`

export type VotingsData = {
  votings: Voting[]
}

export const MY_OPEN_VOTINGS_QUERY = `
  query MyOpenVotings {
    myOpenVotings {
      ${VOTING_FIELDS}
    }
  }
`

export type MyOpenVotingsData = {
  myOpenVotings: Voting[]
}

export const CREATE_VOTING_MUTATION = `
  mutation CreateVoting($input: CreateVotingInput!) {
    createVoting(input: $input) {
      ${VOTING_FIELDS}
    }
  }
`

export type CreateVotingData = {
  createVoting: Voting
}

export const CLOSE_VOTING_MUTATION = `
  mutation CloseVoting($votingId: Int!) {
    closeVoting(votingId: $votingId) {
      ${VOTING_FIELDS}
    }
  }
`

export type CloseVotingData = {
  closeVoting: Voting
}

export const VOTE_VOTING_MUTATION = `
  mutation VoteVoting($votingId: Int!, $optionId: Int!) {
    voteVoting(votingId: $votingId, optionId: $optionId) {
      ${VOTING_FIELDS}
    }
  }
`

export type VoteVotingData = {
  voteVoting: Voting
}
