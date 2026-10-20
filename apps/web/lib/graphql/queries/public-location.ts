/** Public location hub GraphQL documents. */

import type { Prediction } from '@/lib/graphql/queries/predictions'
import type { Voting } from '@/lib/graphql/queries/votings'

export type PublicLocationService = {
  key: string
  hrefSegment: string
  available: boolean
}

export type PublicLocationPredictionTeaser = {
  question: string
  openCount: number
  rewardMode: string
  pointsForVote: number
  pointsForCorrect: number
}

export type PublicLocationVotingTeaser = {
  question: string
  openCount: number
  rewardMode: string
  pointsForVote: number
}

export type PublicLocationListingKind = 'commercial' | 'community'

export type PublicLocation = {
  id: number
  name: string
  publicSlug: string
  listingKind: PublicLocationListingKind
  services: PublicLocationService[]
  headerImageFilename: string | null
  workspaceId: string | null
  mediaOwnerClerkUserId: string | null
  menuDishCount: number | null
  menuOpenPoints: number | null
  predictionTeaser: PublicLocationPredictionTeaser | null
  votingTeaser: PublicLocationVotingTeaser | null
}

export const PUBLIC_LOCATION_QUERY = `
  query PublicLocation($slug: String!) {
    publicLocation(slug: $slug) {
      id
      name
      publicSlug
      listingKind
      services {
        key
        hrefSegment
        available
      }
      headerImageFilename
      workspaceId
      mediaOwnerClerkUserId
      menuDishCount
      menuOpenPoints
      predictionTeaser {
        question
        openCount
        rewardMode
        pointsForVote
        pointsForCorrect
      }
      votingTeaser {
        question
        openCount
        rewardMode
        pointsForVote
      }
    }
  }
`

export type PublicLocationData = {
  publicLocation: PublicLocation | null
}

export const PUBLIC_LOCATION_PREDICTIONS_QUERY = `
  query PublicLocationPredictions($slug: String!) {
    publicLocationPredictions(slug: $slug) {
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
    }
  }
`

export type PublicLocationPredictionsData = {
  publicLocationPredictions: Prediction[]
}

export const PUBLIC_LOCATION_VOTINGS_QUERY = `
  query PublicLocationVotings($slug: String!) {
    publicLocationVotings(slug: $slug) {
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
    }
  }
`

export type PublicLocationVotingsData = {
  publicLocationVotings: Voting[]
}

export const UPDATE_LOCATION_PUBLIC_SLUG_MUTATION = `
  mutation UpdateLocationPublicSlug($locationId: Int!, $publicSlug: String) {
    updateLocationPublicSlug(locationId: $locationId, publicSlug: $publicSlug) {
      locationId
      publicSlug
    }
  }
`

export type UpdateLocationPublicSlugData = {
  updateLocationPublicSlug: {
    locationId: number
    publicSlug: string | null
  }
}

export type PublicLocationDirectoryItem = {
  id: number
  name: string
  publicSlug: string
  city: string | null
  listingKind: PublicLocationListingKind
  headerImageFilename: string | null
  workspaceId: string | null
  mediaOwnerClerkUserId: string | null
  menuDishCount: number
}

export type PublicLocationDirectory = {
  cities: string[]
  locations: PublicLocationDirectoryItem[]
}

export const PUBLIC_LOCATIONS_QUERY = `
  query PublicLocations(
    $city: String
    $query: String
    $listingKind: LocationListingKind
    $first: Int
  ) {
    publicLocations(city: $city, query: $query, listingKind: $listingKind, first: $first) {
      cities
      locations {
        id
        name
        publicSlug
        city
        listingKind
        headerImageFilename
        workspaceId
        mediaOwnerClerkUserId
        menuDishCount
      }
    }
  }
`

export type PublicLocationsData = {
  publicLocations: PublicLocationDirectory
}
