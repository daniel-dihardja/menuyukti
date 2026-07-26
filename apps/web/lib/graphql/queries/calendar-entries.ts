export type CalendarMediaRef = {
  kind: 'photo'
  name: string
}

export type CalendarSourceRef = {
  type: 'instagram_item'
  workflowId: string
  itemId: string
}

export type CalendarEntry = {
  id: number
  locationId: number
  title: string
  description: string
  date: string
  time: string
  mediaRefs: CalendarMediaRef[]
  sourceRef: CalendarSourceRef | null
}

const ENTRY_FIELDS = `
  id
  locationId
  title
  description
  date
  time
  mediaRefs {
    kind
    name
  }
  sourceRef {
    type
    workflowId
    itemId
  }
`

export const CREATE_CALENDAR_ENTRY_MUTATION = `
  mutation CreateCalendarEntry(
    $locationId: Int!
    $title: String!
    $date: String!
    $time: String!
    $description: String
    $mediaRefs: [CalendarMediaRefInput!]
    $sourceRef: CalendarSourceRefInput
  ) {
    createCalendarEntry(
      locationId: $locationId
      title: $title
      date: $date
      time: $time
      description: $description
      mediaRefs: $mediaRefs
      sourceRef: $sourceRef
    ) {
      ${ENTRY_FIELDS}
    }
  }
`

export type CreateCalendarEntryData = {
  createCalendarEntry: CalendarEntry
}

export const UPDATE_CALENDAR_ENTRY_MUTATION = `
  mutation UpdateCalendarEntry(
    $id: Int!
    $title: String
    $date: String
    $time: String
    $description: String
    $mediaRefs: [CalendarMediaRefInput!]
    $sourceRef: CalendarSourceRefInput
  ) {
    updateCalendarEntry(
      id: $id
      title: $title
      date: $date
      time: $time
      description: $description
      mediaRefs: $mediaRefs
      sourceRef: $sourceRef
    ) {
      ${ENTRY_FIELDS}
    }
  }
`

export type UpdateCalendarEntryData = {
  updateCalendarEntry: CalendarEntry
}
