/** Service subscription GraphQL docs and shared catalog keys (no Stripe yet). */

export const SERVICE_KEY_DIGITAL_MENU = 'digital_menu' as const
export const SERVICE_KEY_POINT_SYSTEM = 'point_system' as const
export const SERVICE_KEY_STAMP_CARD = 'stamp_card' as const
export const SERVICE_KEY_CASHBACK = 'cashback' as const
export const SERVICE_KEY_PREDICTION = 'prediction' as const

export const SERVICE_KEYS = [
  SERVICE_KEY_DIGITAL_MENU,
  SERVICE_KEY_POINT_SYSTEM,
  SERVICE_KEY_STAMP_CARD,
  SERVICE_KEY_CASHBACK,
  SERVICE_KEY_PREDICTION,
] as const

export type ServiceKey = (typeof SERVICE_KEYS)[number]

export const SERVICE_STATUS_ACTIVE = 'active' as const
export const SERVICE_STATUS_CANCELED = 'canceled' as const

export type ServiceSubscriptionStatus =
  | typeof SERVICE_STATUS_ACTIVE
  | typeof SERVICE_STATUS_CANCELED

export function isServiceKey(value: string): value is ServiceKey {
  return (SERVICE_KEYS as readonly string[]).includes(value)
}

export type ServiceSubscription = {
  id: string
  workspaceId: string
  locationId: string
  serviceKey: string
  status: string
  createdAt: string | null
  updatedAt: string | null
  canceledAt: string | null
}

export const MY_SERVICE_SUBSCRIPTIONS_QUERY = `
  query MyServiceSubscriptions($includeCanceled: Boolean) {
    myServiceSubscriptions(includeCanceled: $includeCanceled) {
      id
      workspaceId
      locationId
      serviceKey
      status
      createdAt
      updatedAt
      canceledAt
    }
  }
`

export type MyServiceSubscriptionsData = {
  myServiceSubscriptions: ServiceSubscription[]
}

export const ACTIVATE_SERVICE_SUBSCRIPTION_MUTATION = `
  mutation ActivateServiceSubscription($locationId: Int!, $serviceKey: String!) {
    activateServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
      id
      workspaceId
      locationId
      serviceKey
      status
      createdAt
      updatedAt
      canceledAt
    }
  }
`

export type ActivateServiceSubscriptionData = {
  activateServiceSubscription: ServiceSubscription
}

export const CANCEL_SERVICE_SUBSCRIPTION_MUTATION = `
  mutation CancelServiceSubscription($locationId: Int!, $serviceKey: String!) {
    cancelServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
      id
      workspaceId
      locationId
      serviceKey
      status
      createdAt
      updatedAt
      canceledAt
    }
  }
`

export type CancelServiceSubscriptionData = {
  cancelServiceSubscription: ServiceSubscription
}
