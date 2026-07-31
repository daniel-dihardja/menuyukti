export type CrmApp = {
  id: number
  appId: string
  title: string
  cashbackThresholdAmount: number
  cashbackPercent: number
  workspaceId: number
  createdByClerkUserId: string
  createdAt: string
  updatedAt: string
}

const CRM_APP_FIELDS = `
  id
  appId
  title
  cashbackThresholdAmount
  cashbackPercent
  workspaceId
  createdByClerkUserId
  createdAt
  updatedAt
`

export const CRM_APPS_QUERY = `
  query CrmApps($first: Int) {
    crmApps(first: $first) {
      ${CRM_APP_FIELDS}
    }
  }
`

export type CrmAppsData = {
  crmApps: CrmApp[]
}

export const CRM_APP_QUERY = `
  query CrmApp($id: Int!) {
    crmApp(id: $id) {
      ${CRM_APP_FIELDS}
    }
  }
`

export type CrmAppData = {
  crmApp: CrmApp | null
}

export const CREATE_CRM_APP_MUTATION = `
  mutation CreateCrmApp($title: String!) {
    createCrmApp(title: $title) {
      ${CRM_APP_FIELDS}
    }
  }
`

export type CreateCrmAppData = {
  createCrmApp: CrmApp
}

export const UPDATE_CRM_APP_MUTATION = `
  mutation UpdateCrmApp(
    $id: Int!
    $title: String!
    $cashbackThresholdAmount: Int
    $cashbackPercent: Int
  ) {
    updateCrmApp(
      id: $id
      title: $title
      cashbackThresholdAmount: $cashbackThresholdAmount
      cashbackPercent: $cashbackPercent
    ) {
      ${CRM_APP_FIELDS}
    }
  }
`

export type UpdateCrmAppData = {
  updateCrmApp: CrmApp
}

export const DELETE_CRM_APP_MUTATION = `
  mutation DeleteCrmApp($id: Int!) {
    deleteCrmApp(id: $id)
  }
`

export type DeleteCrmAppData = {
  deleteCrmApp: boolean
}
