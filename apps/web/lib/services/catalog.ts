/** Web-only service catalog grouping (not stored in GraphQL). */

import {
  SERVICE_KEY_CASHBACK,
  SERVICE_KEY_DIGITAL_MENU,
  SERVICE_KEY_POINT_SYSTEM,
  SERVICE_KEY_PREDICTION,
  SERVICE_KEY_STAMP_CARD,
  type ServiceKey,
} from '@/lib/graphql/queries/service-subscriptions'

export const SERVICE_CATEGORY_GUEST_EXPERIENCE = 'guest_experience' as const
export const SERVICE_CATEGORY_LOYALTY = 'loyalty' as const
export const SERVICE_CATEGORY_GAMIFICATION = 'gamification' as const

export const SERVICE_CATEGORIES = [
  SERVICE_CATEGORY_GUEST_EXPERIENCE,
  SERVICE_CATEGORY_LOYALTY,
  SERVICE_CATEGORY_GAMIFICATION,
] as const

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const SERVICE_CATEGORY_BY_KEY: Record<ServiceKey, ServiceCategory> = {
  [SERVICE_KEY_DIGITAL_MENU]: SERVICE_CATEGORY_GUEST_EXPERIENCE,
  [SERVICE_KEY_POINT_SYSTEM]: SERVICE_CATEGORY_LOYALTY,
  [SERVICE_KEY_STAMP_CARD]: SERVICE_CATEGORY_LOYALTY,
  [SERVICE_KEY_CASHBACK]: SERVICE_CATEGORY_LOYALTY,
  [SERVICE_KEY_PREDICTION]: SERVICE_CATEGORY_GAMIFICATION,
}

export function categoryForServiceKey(serviceKey: string): ServiceCategory | null {
  if (serviceKey in SERVICE_CATEGORY_BY_KEY) {
    return SERVICE_CATEGORY_BY_KEY[serviceKey as ServiceKey]
  }
  return null
}
