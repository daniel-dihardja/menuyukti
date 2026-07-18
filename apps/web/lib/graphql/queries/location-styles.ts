export type LocationStyle = {
  id: number
  locationId: number
  name: string
  rules: string
  referenceImageName: string
  isDefault: boolean
  styleSpec?: unknown | null
}

const STYLE_FIELDS = `
  id
  locationId
  name
  rules
  referenceImageName
  isDefault
  styleSpec
`

export const LOCATION_STYLES_QUERY = `
  query LocationStyles($locationId: Int!) {
    locationStyles(locationId: $locationId) {
      ${STYLE_FIELDS}
    }
  }
`

export type LocationStylesData = {
  locationStyles: LocationStyle[]
}

export const LOCATION_STYLE_QUERY = `
  query LocationStyle($id: Int!) {
    locationStyle(id: $id) {
      ${STYLE_FIELDS}
    }
  }
`

export type LocationStyleData = {
  locationStyle: LocationStyle | null
}

export const CREATE_LOCATION_STYLE_MUTATION = `
  mutation CreateLocationStyle(
    $locationId: Int!
    $name: String!
    $rules: String!
    $referenceImageName: String!
    $isDefault: Boolean
    $styleSpec: JSON
  ) {
    createLocationStyle(
      locationId: $locationId
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

export type CreateLocationStyleData = {
  createLocationStyle: LocationStyle
}

export const UPDATE_LOCATION_STYLE_MUTATION = `
  mutation UpdateLocationStyle(
    $id: Int!
    $name: String
    $rules: String
    $referenceImageName: String
    $isDefault: Boolean
    $styleSpec: JSON
  ) {
    updateLocationStyle(
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

export type UpdateLocationStyleData = {
  updateLocationStyle: LocationStyle
}

export const DELETE_LOCATION_STYLE_MUTATION = `
  mutation DeleteLocationStyle($id: Int!) {
    deleteLocationStyle(id: $id)
  }
`

export type DeleteLocationStyleData = {
  deleteLocationStyle: boolean
}
