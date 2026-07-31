export type Style = {
  id: number
  workspaceId: number
  createdByClerkUserId: string
  name: string
  rules: string
  referenceImageName: string
  isDefault: boolean
  spec: unknown
}

const STYLE_FIELDS = `
  id
  workspaceId
  createdByClerkUserId
  name
  rules
  referenceImageName
  isDefault
  spec
`

export const STYLES_QUERY = `
  query Styles($first: Int) {
    styles(first: $first) {
      ${STYLE_FIELDS}
    }
  }
`

export type StylesData = {
  styles: Style[]
}

export const STYLE_QUERY = `
  query Style($id: Int!) {
    style(id: $id) {
      ${STYLE_FIELDS}
    }
  }
`

export type StyleData = {
  style: Style | null
}

export const CREATE_STYLE_MUTATION = `
  mutation CreateStyle(
    $name: String!
    $referenceImageName: String!
    $spec: JSON!
    $isDefault: Boolean
  ) {
    createStyle(
      name: $name
      referenceImageName: $referenceImageName
      spec: $spec
      isDefault: $isDefault
    ) {
      ${STYLE_FIELDS}
    }
  }
`

export type CreateStyleData = {
  createStyle: Style
}

export const UPDATE_STYLE_MUTATION = `
  mutation UpdateStyle(
    $id: Int!
    $name: String
    $referenceImageName: String
    $spec: JSON
    $isDefault: Boolean
  ) {
    updateStyle(
      id: $id
      name: $name
      referenceImageName: $referenceImageName
      spec: $spec
      isDefault: $isDefault
    ) {
      ${STYLE_FIELDS}
    }
  }
`

export type UpdateStyleData = {
  updateStyle: Style
}

export const DELETE_STYLE_MUTATION = `
  mutation DeleteStyle($id: Int!) {
    deleteStyle(id: $id)
  }
`

export type DeleteStyleData = {
  deleteStyle: boolean
}
