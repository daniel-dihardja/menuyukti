/** GraphQL `CrmCustomerStatus` enum names. */
export type CrmCustomerStatus = 'ACTIVE' | 'REVOKED' | 'NONE'

export type CrmDevice = {
  id: string
  platform: string
  label: string | null
  createdAt: string
  lastSeenAt: string | null
  revokedAt: string | null
}

export type CrmCustomer = {
  id: string
  appId: number
  phoneMasked: string
  givenName: string | null
  familyName: string | null
  createdAt: string
  deviceCount: number
  lastSeenAt: string | null
  status: CrmCustomerStatus
  devices?: CrmDevice[]
}

export type CrmEnrollmentToken = {
  token: string
  expiresAt: string
  enrollUrl: string
}

const CRM_CUSTOMER_LIST_FIELDS = `
  id
  appId
  phoneMasked
  givenName
  familyName
  createdAt
  deviceCount
  lastSeenAt
  status
`

const CRM_DEVICE_FIELDS = `
  id
  platform
  label
  createdAt
  lastSeenAt
  revokedAt
`

export const CRM_CUSTOMERS_QUERY = `
  query CrmCustomers($appId: Int!, $search: String) {
    crmCustomers(appId: $appId, search: $search) {
      ${CRM_CUSTOMER_LIST_FIELDS}
    }
  }
`

export type CrmCustomersData = {
  crmCustomers: CrmCustomer[]
}

export const CRM_CUSTOMER_QUERY = `
  query CrmCustomer($id: UUID!) {
    crmCustomer(id: $id) {
      ${CRM_CUSTOMER_LIST_FIELDS}
      devices {
        ${CRM_DEVICE_FIELDS}
      }
    }
  }
`

export type CrmCustomerData = {
  crmCustomer: CrmCustomer | null
}

export const CREATE_CRM_ENROLLMENT_TOKEN_MUTATION = `
  mutation CreateCrmEnrollmentToken($appId: Int!) {
    createCrmEnrollmentToken(appId: $appId) {
      token
      expiresAt
      enrollUrl
    }
  }
`

export type CreateCrmEnrollmentTokenData = {
  createCrmEnrollmentToken: CrmEnrollmentToken
}

export const DELETE_CRM_CUSTOMER_MUTATION = `
  mutation DeleteCrmCustomer($id: UUID!) {
    deleteCrmCustomer(id: $id)
  }
`

export type DeleteCrmCustomerData = {
  deleteCrmCustomer: boolean
}

export const REVOKE_CRM_DEVICE_MUTATION = `
  mutation RevokeCrmDevice($deviceId: UUID!) {
    revokeCrmDevice(deviceId: $deviceId) {
      ${CRM_DEVICE_FIELDS}
    }
  }
`

export type RevokeCrmDeviceData = {
  revokeCrmDevice: CrmDevice
}

export type CrmCashbackEntry = {
  id: string
  customerId: string
  amount: number
  paymentAmount: number | null
  cashbackPercent: number | null
  label: string | null
  createdAt: string
}

export const AWARD_CRM_CASHBACK_MUTATION = `
  mutation AwardCrmCashback(
    $customerId: UUID!
    $paymentAmount: Int
    $redeemAmount: Int
    $label: String
  ) {
    awardCrmCashback(
      customerId: $customerId
      paymentAmount: $paymentAmount
      redeemAmount: $redeemAmount
      label: $label
    ) {
      id
      customerId
      amount
      paymentAmount
      cashbackPercent
      label
      createdAt
    }
  }
`

export type AwardCrmCashbackData = {
  awardCrmCashback: CrmCashbackEntry
}
