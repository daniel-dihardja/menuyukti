export const INGEST_DEV_DATA_MUTATION = `
  mutation IngestDevData($targetClerkUserId: String!, $scope: String!) {
    ingestDevData(targetClerkUserId: $targetClerkUserId, scope: $scope) {
      scope
      clerkUserId
      workspaceId
      createdPrimary
      inventarCleared
      inventarLocationId
      inventarLocationName
      analyticsLocationId
      analyticsLocationName
      inventarCatalogItems
      inventarStockRows
      inventarMovements
      inventarMenuCategories
      inventarMenuItems
      inventarClearedPosOrders
      analyticsRunId
      analyticsOrderRows
      analyticsLocationCogs
      analyticsDeletedSeedRuns
      analyticsPosSystem
      analyticsMenuCategories
      analyticsMenuItems
      analyticsClearedPosOrders
      notes
    }
  }
`

export type IngestDevDataResult = {
  scope: string
  clerkUserId: string
  workspaceId: string
  createdPrimary: boolean
  inventarCleared: boolean
  inventarLocationId: string | null
  inventarLocationName: string | null
  analyticsLocationId: string | null
  analyticsLocationName: string | null
  inventarCatalogItems: number | null
  inventarStockRows: number | null
  inventarMovements: number | null
  inventarMenuCategories: number | null
  inventarMenuItems: number | null
  inventarClearedPosOrders: number | null
  analyticsRunId: string | null
  analyticsOrderRows: number | null
  analyticsLocationCogs: number | null
  analyticsDeletedSeedRuns: number | null
  analyticsPosSystem: string | null
  analyticsMenuCategories: number | null
  analyticsMenuItems: number | null
  analyticsClearedPosOrders: number | null
  notes: string[]
}

export type IngestDevDataData = {
  ingestDevData: IngestDevDataResult
}
