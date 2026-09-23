export const LOCATIONS_LIST_QUERY = `
  query LocationsList($first: Int) {
    locations(first: $first) {
      id
      name
      nodeId
      city
      country
      currency
      areas {
        id
        name
        sortOrder
      }
    }
  }
`

export type LocationArea = {
  id: string
  name: string
  sortOrder: number
}

export const LOCATIONS_QUERY = `
  query Locations($first: Int) {
    locations(first: $first) {
      id
      name
      nodeId
      city
      country
      currency
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
      areas {
        id
        name
        sortOrder
      }
    }
  }
`

export type LocationsListData = {
  locations: Array<{
    id: string
    name: string
    nodeId: string | null
    city: string | null
    country: string | null
    currency: string | null
    areas: LocationArea[]
  }>
}

export const LOCATION_ANALYTICS_SUMMARIES_QUERY = `
  query LocationAnalyticsSummaries($locationIds: [Int!]!) {
    locationAnalyticsSummaries(locationIds: $locationIds) {
      locationId
      runCount
      latestRun {
        id
        name
      }
    }
  }
`

export type LocationAnalyticsSummariesData = {
  locationAnalyticsSummaries: Array<{
    locationId: number
    runCount: number
    latestRun: { id: string; name: string } | null
  }>
}

export type LocationsData = {
  locations: Array<{
    id: string
    name: string
    nodeId: string | null
    city: string | null
    country: string | null
    currency: string | null
    openingHours: Array<{
      dayOfWeek: string
      openTime: string
      closeTime: string
    }>
    areas: LocationArea[]
  }>
}

export const LOCATION_QUERY = `
  query Location($id: ID!) {
    location(id: $id) {
      id
      name
      publicSlug
      street
      city
      country
      currency
      nodeId
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
      areas {
        id
        name
        sortOrder
      }
      manualBriefInput {
        locationId
        quickProfile
      }
      frontpage {
        locationId
        tagline
        showGuestFavorites
        showPopularCombos
        wallEnabled
        favoriteImages {
          menu
          imageFilename
          description
          published
        }
        comboImages {
          menuA
          menuB
          imageFilename
          description
          published
        }
      }
    }
  }
`

export type FrontpageFavoriteImage = {
  menu: string
  imageFilename: string | null
  description: string | null
  published: boolean
}

export type FrontpageComboImage = {
  menuA: string
  menuB: string
  imageFilename: string | null
  description: string | null
  published: boolean
}

export type LocationFrontpageConfig = {
  locationId: number
  tagline: string | null
  showGuestFavorites: boolean
  showPopularCombos: boolean
  wallEnabled: boolean
  favoriteImages: FrontpageFavoriteImage[]
  comboImages: FrontpageComboImage[]
}

export type LocationData = {
  location: {
    id: string
    name: string
    publicSlug: string | null
    street: string | null
    city: string | null
    country: string | null
    currency: string | null
    nodeId: string | null
    openingHours: Array<{
      dayOfWeek: string
      openTime: string
      closeTime: string
    }>
    areas: LocationArea[]
    manualBriefInput: {
      locationId: number
      quickProfile: Record<string, unknown>
    } | null
    frontpage: LocationFrontpageConfig | null
  } | null
}

export const UPDATE_LOCATION_MANUAL_BRIEF_MUTATION = `
  mutation UpdateLocationManualBriefInput($locationId: Int!, $quickProfile: JSON!) {
    updateLocationManualBriefInput(locationId: $locationId, quickProfile: $quickProfile) {
      locationId
      quickProfile
    }
  }
`

export type UpdateLocationManualBriefData = {
  updateLocationManualBriefInput: {
    locationId: number
    quickProfile: Record<string, unknown>
  }
}

export const UPDATE_LOCATION_FRONTPAGE_MUTATION = `
  mutation UpdateLocationFrontpage(
    $locationId: Int!
    $tagline: String
    $showGuestFavorites: Boolean!
    $showPopularCombos: Boolean!
    $wallEnabled: Boolean
    $publicSlug: String
    $favoriteImages: [FrontpageFavoriteImageInput!]
    $comboImages: [FrontpageComboImageInput!]
  ) {
    updateLocationFrontpage(
      locationId: $locationId
      tagline: $tagline
      showGuestFavorites: $showGuestFavorites
      showPopularCombos: $showPopularCombos
      wallEnabled: $wallEnabled
      publicSlug: $publicSlug
      favoriteImages: $favoriteImages
      comboImages: $comboImages
    ) {
      locationId
      tagline
      showGuestFavorites
      showPopularCombos
      wallEnabled
      favoriteImages {
        menu
        imageFilename
        description
        published
      }
      comboImages {
        menuA
        menuB
        imageFilename
        description
        published
      }
    }
  }
`

export type UpdateLocationFrontpageData = {
  updateLocationFrontpage: LocationFrontpageConfig
}

export const PUBLIC_LOCATION_WALL_QUERY = `
  query PublicLocationWall($slug: String!) {
    publicLocationWall(slug: $slug) {
      locationId
      name
      tagline
      publicSlug
      workspaceId
      mediaOwnerClerkUserId
      tiles {
        kind
        key
        title
        description
        imageFilename
      }
    }
  }
`

export type PublicWallTile = {
  kind: string
  key: string
  title: string
  description: string | null
  imageFilename: string | null
}

export type PublicLocationWallPayload = {
  locationId: number
  name: string
  tagline: string | null
  publicSlug: string
  workspaceId: string | null
  mediaOwnerClerkUserId: string | null
  tiles: PublicWallTile[]
}

export type PublicLocationWallData = {
  publicLocationWall: PublicLocationWallPayload | null
}

export const MY_WORKSPACE_QUERY = `
  query MyWorkspace {
    myWorkspace {
      id
      name
      ownerClerkUserId
      plan
      createdAt
    }
  }
`

export type MyWorkspaceData = {
  myWorkspace: {
    id: string
    name: string
    ownerClerkUserId: string
    plan: string
    createdAt: string | null
  } | null
}

export const PROVISION_WORKSPACE_MUTATION = `
  mutation ProvisionWorkspace($ownerClerkUserId: String!, $name: String!, $plan: String) {
    provisionWorkspace(ownerClerkUserId: $ownerClerkUserId, name: $name, plan: $plan) {
      id
      name
      ownerClerkUserId
      plan
      createdAt
    }
  }
`

export type ProvisionWorkspaceData = {
  provisionWorkspace: {
    id: string
    name: string
    ownerClerkUserId: string
    plan: string
    createdAt: string | null
  }
}

export const CREATE_LOCATION_MUTATION = `
  mutation CreateLocation(
    $workspaceId: ID!
    $name: String!
    $street: String
    $city: String
    $country: String
    $currency: String
  ) {
    createLocation(
      workspaceId: $workspaceId
      name: $name
      street: $street
      city: $city
      country: $country
      currency: $currency
    ) {
      id
      name
      nodeId
    }
  }
`

export type CreateLocationData = {
  createLocation: { id: string; name: string; nodeId: string | null }
}

export const UPDATE_LOCATION_MUTATION = `
  mutation UpdateLocation(
    $id: ID!
    $name: String
    $street: String
    $city: String
    $country: String
    $currency: String
    $openingHours: [OpeningHourInput!]
  ) {
    updateLocation(
      id: $id
      name: $name
      street: $street
      city: $city
      country: $country
      currency: $currency
      openingHours: $openingHours
    ) {
      id
      name
      street
      city
      country
      currency
      nodeId
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
    }
  }
`

export type UpdateLocationData = {
  updateLocation: {
    id: string
    name: string
    street: string | null
    city: string | null
    country: string | null
    currency: string | null
    nodeId: string | null
    openingHours: Array<{
      dayOfWeek: string
      openTime: string
      closeTime: string
    }>
  }
}

export const DELETE_LOCATION_MUTATION = `
  mutation DeleteLocation($id: ID!) {
    deleteLocation(id: $id)
  }
`

export type DeleteLocationData = {
  deleteLocation: boolean
}

export const CREATE_LOCATION_AREA_MUTATION = `
  mutation CreateLocationArea($locationId: Int!, $name: String!, $sortOrder: Int) {
    createLocationArea(locationId: $locationId, name: $name, sortOrder: $sortOrder) {
      id
      locationId
      name
      sortOrder
    }
  }
`

export type CreateLocationAreaData = {
  createLocationArea: {
    id: string
    locationId: string
    name: string
    sortOrder: number
  }
}

export const UPDATE_LOCATION_AREA_MUTATION = `
  mutation UpdateLocationArea($id: Int!, $name: String, $sortOrder: Int) {
    updateLocationArea(id: $id, name: $name, sortOrder: $sortOrder) {
      id
      locationId
      name
      sortOrder
    }
  }
`

export type UpdateLocationAreaData = {
  updateLocationArea: {
    id: string
    locationId: string
    name: string
    sortOrder: number
  }
}

export const DELETE_LOCATION_AREA_MUTATION = `
  mutation DeleteLocationArea($id: Int!) {
    deleteLocationArea(id: $id)
  }
`

export type DeleteLocationAreaData = {
  deleteLocationArea: boolean
}
