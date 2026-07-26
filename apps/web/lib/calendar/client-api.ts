import { apiFetch } from '@/lib/api/client-fetch'
import type {
  CalendarEntry,
  CalendarMediaRef,
  CalendarSourceRef,
} from '@/lib/graphql/queries/calendar-entries'

export type { CalendarEntry, CalendarMediaRef, CalendarSourceRef }

export async function createCalendarEntry(input: {
  locationId: number
  title: string
  description?: string
  date: string
  time: string
  mediaRefs?: CalendarMediaRef[]
  sourceRef?: CalendarSourceRef
}): Promise<CalendarEntry> {
  const result = await apiFetch<{ entry: CalendarEntry }>(
    '/api/calendar-entries',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to create calendar entry',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.entry
}

export async function updateCalendarEntry(
  id: number,
  input: {
    title?: string
    description?: string
    date?: string
    time?: string
    mediaRefs?: CalendarMediaRef[]
    sourceRef?: CalendarSourceRef
  },
): Promise<CalendarEntry> {
  const result = await apiFetch<{ entry: CalendarEntry }>(
    `/api/calendar-entries/${encodeURIComponent(String(id))}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to update calendar entry',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.entry
}

export async function deleteCalendarEntry(id: number): Promise<CalendarEntry> {
  const result = await apiFetch<{ entry: CalendarEntry }>(
    `/api/calendar-entries/${encodeURIComponent(String(id))}`,
    {
      method: 'DELETE',
    },
    'Failed to delete calendar entry',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.entry
}
