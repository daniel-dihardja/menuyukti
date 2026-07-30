export type CalendarMediaRef = {
  kind: 'photo'
  name: string
}

export type CalendarEntry = {
  id: number
  locationId: number
  title: string
  description: string
  date: string
  time: string
  mediaRefs: CalendarMediaRef[]
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
`

export const CREATE_CALENDAR_ENTRY_MUTATION = `
  mutation CreateCalendarEntry(
    $locationId: Int!
    $title: String!
    $date: String!
    $time: String!
    $description: String
    $mediaRefs: [CalendarMediaRefInput!]
  ) {
    createCalendarEntry(
      locationId: $locationId
      title: $title
      date: $date
      time: $time
      description: $description
      mediaRefs: $mediaRefs
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
  ) {
    updateCalendarEntry(
      id: $id
      title: $title
      date: $date
      time: $time
      description: $description
      mediaRefs: $mediaRefs
    ) {
      ${ENTRY_FIELDS}
    }
  }
`

export type UpdateCalendarEntryData = {
  updateCalendarEntry: CalendarEntry
}

export const DELETE_CALENDAR_ENTRY_MUTATION = `
  mutation DeleteCalendarEntry($id: Int!) {
    deleteCalendarEntry(id: $id) {
      ${ENTRY_FIELDS}
    }
  }
`

export type DeleteCalendarEntryData = {
  deleteCalendarEntry: CalendarEntry
}
