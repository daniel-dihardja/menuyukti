export type CrmCustomer = {
  id: string
  phoneMasked: string
  createdAt: string
  deviceCount: number
}

export type CrmEnrollmentToken = {
  token: string
  expiresAt: string
  enrollUrl: string
}

const CRM_CUSTOMER_FIELDS = `
  id
  phoneMasked
  createdAt
  deviceCount
`

export const CRM_CUSTOMERS_QUERY = `
  query CrmCustomers($appId: Int!) {
    crmCustomers(appId: $appId) {
      ${CRM_CUSTOMER_FIELDS}
    }
  }
`

export type CrmCustomersData = {
  crmCustomers: CrmCustomer[]
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
