import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import {
  datesMilestoneDataSchema,
  datesMilestoneInputValueSchema,
  postLineupMilestoneDataSchema,
  reelLineupMilestoneDataSchema,
  schedulerMilestoneDataSchema,
  type CampaignWindowPublicHoliday,
  type PostLineupPost,
  type ReelLineupReel,
  type SchedulerMilestoneData,
} from '@/lib/graphql/node-schemas'

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export type SchedulerWindow = {
  startDate: string
  endDate: string
  publicHolidays: CampaignWindowPublicHoliday[]
  sourceDatesTitle?: string
}

export function parseIsoDateOnly(value: string): Date | undefined {
  const trimmed = value.trim()
  if (!trimmed || !ISO_DATE_ONLY.test(trimmed)) {
    return undefined
  }

  const [ys, ms, ds] = trimmed.split('-')
  const year = Number(ys)
  const month = Number(ms)
  const day = Number(ds)
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined
  }

  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return date
}

function hasWindow(startDate: string, endDate: string): boolean {
  return startDate.trim().length > 0 && endDate.trim().length > 0
}

function windowFromSchedulerData(data: SchedulerMilestoneData): SchedulerWindow | null {
  if (!hasWindow(data.startDate, data.endDate)) {
    return null
  }
  return {
    startDate: data.startDate.trim(),
    endDate: data.endDate.trim(),
    publicHolidays: data.publicHolidays,
    ...(data.sourceDatesTitle?.trim() ? { sourceDatesTitle: data.sourceDatesTitle.trim() } : {}),
  }
}

function windowFromDatesData(data: unknown, sourceDatesTitle?: string): SchedulerWindow | null {
  const parsed = datesMilestoneDataSchema.safeParse(data)
  if (!parsed.success || !hasWindow(parsed.data.startDate, parsed.data.endDate)) {
    return null
  }
  return {
    startDate: parsed.data.startDate.trim(),
    endDate: parsed.data.endDate.trim(),
    publicHolidays: parsed.data.publicHolidays,
    ...(sourceDatesTitle?.trim() ? { sourceDatesTitle: sourceDatesTitle.trim() } : {}),
  }
}

function windowFromDatesInput(
  milestoneInput: TimelineMilestone['milestoneInput'],
  sourceDatesTitle?: string,
): SchedulerWindow | null {
  if (milestoneInput?.type !== 'dates' || milestoneInput.value == null) {
    return null
  }
  const parsed = datesMilestoneInputValueSchema.safeParse(milestoneInput.value)
  if (!parsed.success || !hasWindow(parsed.data.startDate, parsed.data.endDate)) {
    return null
  }
  return {
    startDate: parsed.data.startDate.trim(),
    endDate: parsed.data.endDate.trim(),
    publicHolidays: [],
    ...(sourceDatesTitle?.trim() ? { sourceDatesTitle: sourceDatesTitle.trim() } : {}),
  }
}

export function findPriorDatesMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): TimelineMilestone | undefined {
  const index = milestones.findIndex((milestone) => milestone.id === currentMilestoneId)
  if (index < 0) {
    return undefined
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    if (milestones[i]?.presetId === 'dates') {
      return milestones[i]
    }
  }

  return undefined
}

export function findPriorPostLineupMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): TimelineMilestone | undefined {
  const index = milestones.findIndex((milestone) => milestone.id === currentMilestoneId)
  if (index < 0) {
    return undefined
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    if (milestones[i]?.presetId === 'post_lineup') {
      return milestones[i]
    }
  }

  return undefined
}

export function resolvePostLineupPostsForScheduler(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): PostLineupPost[] {
  const priorPostLineup = findPriorPostLineupMilestone(milestones, currentMilestoneId)
  if (!priorPostLineup) {
    return []
  }
  const parsed = postLineupMilestoneDataSchema.safeParse(priorPostLineup.data)
  return parsed.success ? parsed.data.posts : []
}

export function findPriorReelLineupMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): TimelineMilestone | undefined {
  const index = milestones.findIndex((milestone) => milestone.id === currentMilestoneId)
  if (index < 0) {
    return undefined
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    if (milestones[i]?.presetId === 'reel_lineup') {
      return milestones[i]
    }
  }

  return undefined
}

export function resolveReelLineupReelsForScheduler(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): ReelLineupReel[] {
  const priorReelLineup = findPriorReelLineupMilestone(milestones, currentMilestoneId)
  if (!priorReelLineup) {
    return []
  }
  const parsed = reelLineupMilestoneDataSchema.safeParse(priorReelLineup.data)
  return parsed.success ? parsed.data.reels : []
}

export type ResolveSchedulerWindowResult =
  | { status: 'ready'; window: SchedulerWindow }
  | { status: 'no_prior_dates' }
  | { status: 'incomplete_window' }

export function resolveSchedulerWindow({
  milestone,
  milestones,
}: {
  milestone: TimelineMilestone
  milestones: TimelineMilestone[]
}): ResolveSchedulerWindowResult {
  const schedulerParsed = schedulerMilestoneDataSchema.safeParse(milestone.data)
  if (schedulerParsed.success) {
    const fromScheduler = windowFromSchedulerData(schedulerParsed.data)
    if (fromScheduler) {
      return { status: 'ready', window: fromScheduler }
    }
  }

  const priorDates = findPriorDatesMilestone(milestones, milestone.id)
  if (!priorDates) {
    return { status: 'no_prior_dates' }
  }

  const sourceDatesTitle = priorDates.title?.trim() || undefined
  const fromDatesData = windowFromDatesData(priorDates.data, sourceDatesTitle)
  if (fromDatesData) {
    return { status: 'ready', window: fromDatesData }
  }

  const fromDatesInput = windowFromDatesInput(priorDates.milestoneInput, sourceDatesTitle)
  if (fromDatesInput) {
    return { status: 'ready', window: fromDatesInput }
  }

  return { status: 'incomplete_window' }
}

export function holidayDatesFromWindow(window: SchedulerWindow): Date[] {
  return window.publicHolidays
    .map((holiday) => parseIsoDateOnly(holiday.date))
    .filter((date): date is Date => date !== undefined)
}
