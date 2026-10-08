/** Prediction service GraphQL documents. */

export const REWARD_MODE_SOCIAL = 'social' as const
export const REWARD_MODE_POINTS = 'points' as const

export type PredictionRewardMode = typeof REWARD_MODE_SOCIAL | typeof REWARD_MODE_POINTS

export type PredictionOutcome = {
  id: number
  label: string
  sortOrder: number
}

export type PredictionVote = {
  id: number
  outcomeId: number
  clerkUserId: string
  createdAt: string
}

export type Prediction = {
  id: number
  locationId: number
  locationName: string
  question: string
  status: string
  closesAt: string
  rewardMode: string
  pointsForVote: number
  pointsForCorrect: number
  winningOutcomeId: number | null
  createdAt: string
  resolvedAt: string | null
  outcomes: PredictionOutcome[]
  myVote: PredictionVote | null
  voteCount: number
}

const PREDICTION_FIELDS = `
  id
  locationId
  locationName
  question
  status
  closesAt
  rewardMode
  pointsForVote
  pointsForCorrect
  winningOutcomeId
  createdAt
  resolvedAt
  outcomes {
    id
    label
    sortOrder
  }
  myVote {
    id
    outcomeId
    clerkUserId
    createdAt
  }
  voteCount
`

export const PREDICTIONS_QUERY = `
  query Predictions($locationId: Int!) {
    predictions(locationId: $locationId) {
      ${PREDICTION_FIELDS}
    }
  }
`

export type PredictionsData = {
  predictions: Prediction[]
}

export const MY_OPEN_PREDICTIONS_QUERY = `
  query MyOpenPredictions {
    myOpenPredictions {
      ${PREDICTION_FIELDS}
    }
  }
`

export type MyOpenPredictionsData = {
  myOpenPredictions: Prediction[]
}

export const CREATE_PREDICTION_MUTATION = `
  mutation CreatePrediction($input: CreatePredictionInput!) {
    createPrediction(input: $input) {
      ${PREDICTION_FIELDS}
    }
  }
`

export type CreatePredictionData = {
  createPrediction: Prediction
}

export const CLOSE_PREDICTION_MUTATION = `
  mutation ClosePrediction($predictionId: Int!) {
    closePrediction(predictionId: $predictionId) {
      ${PREDICTION_FIELDS}
    }
  }
`

export type ClosePredictionData = {
  closePrediction: Prediction
}

export const RESOLVE_PREDICTION_MUTATION = `
  mutation ResolvePrediction($predictionId: Int!, $winningOutcomeId: Int!) {
    resolvePrediction(predictionId: $predictionId, winningOutcomeId: $winningOutcomeId) {
      ${PREDICTION_FIELDS}
    }
  }
`

export type ResolvePredictionData = {
  resolvePrediction: Prediction
}

export const VOTE_PREDICTION_MUTATION = `
  mutation VotePrediction($predictionId: Int!, $outcomeId: Int!) {
    votePrediction(predictionId: $predictionId, outcomeId: $outcomeId) {
      ${PREDICTION_FIELDS}
    }
  }
`

export type VotePredictionData = {
  votePrediction: Prediction
}
