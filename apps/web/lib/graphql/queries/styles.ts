export type Style = {
  id: number
  workspaceId: number
  createdByClerkUserId: string
  name: string
  rules: string
  referenceImageName: string
  isDefault: boolean
  styleSpec?: unknown | null
}

const STYLE_FIELDS = `
  id
  workspaceId
  createdByClerkUserId
  name
  rules
  referenceImageName
  isDefault
  styleSpec
`

export const STYLES_QUERY = `
  query Styles {
    styles {
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
    $rules: String!
    $referenceImageName: String!
    $isDefault: Boolean
    $styleSpec: JSON
  ) {
    createStyle(
      name: $name
      rules: $rules
      referenceImageName: $referenceImageName
      isDefault: $isDefault
      styleSpec: $styleSpec
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
    $rules: String
    $referenceImageName: String
    $isDefault: Boolean
    $styleSpec: JSON
  ) {
    updateStyle(
      id: $id
      name: $name
      rules: $rules
      referenceImageName: $referenceImageName
      isDefault: $isDefault
      styleSpec: $styleSpec
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
