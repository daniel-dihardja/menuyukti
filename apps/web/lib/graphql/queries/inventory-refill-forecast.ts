export type InventoryRefillForecastConfidence = 'ok' | 'insufficient_history'

export type InventoryRefillForecastItem = {
  catalogItemId: number
  name: string
  storageZone: 'cooler' | 'freezer' | 'dry'
  onHand: number
  minOnHand: number | null
  avgDailyOut: number
  daysUntilRefill: number | null
  priorityRank: number
  confidence: InventoryRefillForecastConfidence
  windowDays: number
}

export const INVENTORY_REFILL_FORECAST_QUERY = `
  query InventoryRefillForecast($locationId: ID!, $windowDays: Int) {
    inventoryRefillForecast(locationId: $locationId, windowDays: $windowDays) {
      catalogItemId
      name
      storageZone
      onHand
      minOnHand
      avgDailyOut
      daysUntilRefill
      priorityRank
      confidence
      windowDays
    }
  }
`

export type InventoryRefillForecastData = {
  inventoryRefillForecast: InventoryRefillForecastItem[]
}
