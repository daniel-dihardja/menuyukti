/** Point System earn rules GraphQL docs and shared action keys. */

export const POINT_EARN_ACTION_OPEN_MENU_QR = 'open_menu_qr' as const
export const POINT_EARN_ACTION_COMPLETE_ORDER = 'complete_order' as const

export const POINT_EARN_ACTION_KEYS = [
  POINT_EARN_ACTION_OPEN_MENU_QR,
  POINT_EARN_ACTION_COMPLETE_ORDER,
] as const

export type PointEarnActionKey = (typeof POINT_EARN_ACTION_KEYS)[number]

export function isPointEarnActionKey(value: string): value is PointEarnActionKey {
  return (POINT_EARN_ACTION_KEYS as readonly string[]).includes(value)
}

export type PointEarnRule = {
  actionKey: string
  points: number
  enabled: boolean
}

export const POINT_EARN_RULES_QUERY = `
  query PointEarnRules($locationId: Int!) {
    pointEarnRules(locationId: $locationId) {
      actionKey
      points
      enabled
    }
  }
`

export type PointEarnRulesData = {
  pointEarnRules: PointEarnRule[]
}

export const UPSERT_POINT_EARN_RULES_MUTATION = `
  mutation UpsertPointEarnRules($locationId: Int!, $rules: [PointEarnRuleInput!]!) {
    upsertPointEarnRules(locationId: $locationId, rules: $rules) {
      actionKey
      points
      enabled
    }
  }
`

export type UpsertPointEarnRulesData = {
  upsertPointEarnRules: PointEarnRule[]
}
