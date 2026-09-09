export type Playbook = {
  id: number
  locationId: number
  name: string
  playbookType: string
  startDate: string
  endDate: string
}

const PLAYBOOK_FIELDS = `
  id
  locationId
  name
  playbookType
  startDate
  endDate
`

export const PLAYBOOKS_QUERY = `
  query Playbooks($playbookType: String!) {
    playbooks(playbookType: $playbookType) {
      ${PLAYBOOK_FIELDS}
    }
  }
`

export type PlaybooksData = {
  playbooks: Playbook[]
}

export const PLAYBOOK_QUERY = `
  query Playbook($id: Int!) {
    playbook(id: $id) {
      ${PLAYBOOK_FIELDS}
    }
  }
`

export type PlaybookData = {
  playbook: Playbook | null
}

export const CREATE_PLAYBOOK_MUTATION = `
  mutation CreatePlaybook(
    $locationId: Int!
    $name: String!
    $playbookType: String!
    $startDate: String!
    $endDate: String!
  ) {
    createPlaybook(
      locationId: $locationId
      name: $name
      playbookType: $playbookType
      startDate: $startDate
      endDate: $endDate
    ) {
      ${PLAYBOOK_FIELDS}
    }
  }
`

export type CreatePlaybookData = {
  createPlaybook: Playbook
}

export const DELETE_PLAYBOOK_MUTATION = `
  mutation DeletePlaybook($id: Int!) {
    deletePlaybook(id: $id)
  }
`

export type DeletePlaybookData = {
  deletePlaybook: boolean
}

export const UPDATE_PLAYBOOK_MUTATION = `
  mutation UpdatePlaybook(
    $id: Int!
    $name: String!
    $locationId: Int!
    $startDate: String!
    $endDate: String!
  ) {
    updatePlaybook(
      id: $id
      name: $name
      locationId: $locationId
      startDate: $startDate
      endDate: $endDate
    ) {
      ${PLAYBOOK_FIELDS}
    }
  }
`

export type UpdatePlaybookData = {
  updatePlaybook: Playbook
}
