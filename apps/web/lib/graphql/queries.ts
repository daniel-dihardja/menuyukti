/**
 * GraphQL query and mutation strings and response types used by the web app.
 */

export * from './queries/parse-helpers'
export * from './queries/locations'
export * from './queries/styles'
export * from './queries/calendar-entries'
export * from './queries/workflows'
export * from './queries/analytics'
export * from './queries/workspace'
export * from './queries/posts'
export {
  SCHEDULER_CALENDAR_QUERY,
  type CalendarDisplaySlot,
  type SchedulerCalendarPayload,
  type SchedulerCalendarData,
} from './queries/scheduler-calendar'
