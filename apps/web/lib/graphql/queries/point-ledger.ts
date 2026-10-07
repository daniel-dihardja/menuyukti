/** Clerk-keyed guest point ledger GraphQL docs. */

import {
  POINT_EARN_ACTION_OPEN_MENU_QR,
  type PointEarnActionKey,
} from '@/lib/graphql/queries/point-earn-rules'

export { POINT_EARN_ACTION_OPEN_MENU_QR }

export type MyPointBalance = {
  locationId: number
  locationName: string
  balance: number
}

export type MyPointEntry = {
  id: string
  locationId: number
  locationName: string
  amount: number
  actionKey: string
  label: string | null
  createdAt: string
}

export const MY_POINT_BALANCES_QUERY = `
  query MyPointBalances {
    myPointBalances {
      locationId
      locationName
      balance
    }
  }
`

export type MyPointBalancesData = {
  myPointBalances: MyPointBalance[]
}

export const MY_POINT_ENTRIES_QUERY = `
  query MyPointEntries($limit: Int) {
    myPointEntries(limit: $limit) {
      id
      locationId
      locationName
      amount
      actionKey
      label
      createdAt
    }
  }
`

export type MyPointEntriesData = {
  myPointEntries: MyPointEntry[]
}

export const RECORD_POINT_EARN_EVENT_MUTATION = `
  mutation RecordPointEarnEvent($locationId: Int!, $actionKey: String!) {
    recordPointEarnEvent(locationId: $locationId, actionKey: $actionKey) {
      awarded
      balance
    }
  }
`

export type RecordPointEarnEventData = {
  recordPointEarnEvent: {
    awarded: boolean
    balance: number
  }
}

export type GuestPointEarnActionKey = Extract<PointEarnActionKey, 'open_menu_qr'>
