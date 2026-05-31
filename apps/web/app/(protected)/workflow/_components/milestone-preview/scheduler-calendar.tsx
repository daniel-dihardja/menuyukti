'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { cn } from '@workspace/ui/lib/utils'

import { useMediaQuery } from '@/hooks/use-media-query'
import { MilestonePreviewListDetailShell } from '@/app/(protected)/workflow/_components/milestone-preview/milestone-preview-list-detail'
import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'
import type { PostLineupPost, SchedulerMilestoneData } from '@/lib/graphql/node-schemas'
import {
  canGoToNextMonth,
  canGoToNextWeek,
  canGoToPreviousMonth,
  canGoToPreviousWeek,
  clampMonthStart,
  clampWeekStart,
  formatSchedulerMonthLabel,
  formatSchedulerWeekRange,
  monthStartIsoForWeek,
  nextMonthStartIso,
  nextWeekStartIso,
  previousMonthStartIso,
  previousWeekStartIso,
  resolveSchedulerPostDetail,
  schedulerSlotClassName,
  schedulerSlotDisplayTime,
  schedulerSlotDisplayTitle,
  schedulerSlotKind,
  schedulerSlotTypeLabel,
  schedulerSlotsForDate,
  schedulerSlotsForDateDetail,
  startOfMonth,
  startOfWeekMonday,
  weekStartIsoForDay,
  weekStartIsoForMonth,
} from '@/lib/milestones/scheduler-calendar'

import { SchedulerCalendarMonthGrid } from './scheduler-calendar-month-grid'
import { SchedulerCalendarMonthList } from './scheduler-calendar-month-list'
import { SchedulerCalendarWeekGrid } from './scheduler-calendar-week-grid'
import { PostLineupPostBadges, PostLineupSlides } from './post-lineup-preview-parts'

export type SchedulerCalendarViewMode = 'week' | 'month'

export type SchedulerCalendarProps = {
  windowStart: string
  windowEnd: string
  locale: string
  slots?: SchedulerMilestoneData['slots']
  postLineupPosts?: PostLineupPost[]
  className?: string
}

function formatSchedulerDateDetailLabel(isoDate: string, locale: string): string {
  const date = parseIsoDateOnly(isoDate)
  if (!date) {
    return isoDate
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

type SchedulerCalendarDateDetailProps = {
  selectedDateIso: string
  slots: SchedulerMilestoneData['slots']
  postLineupPosts?: PostLineupPost[]
}

function SchedulerPostSlotDetailCard({
  slot,
  post,
}: {
  slot: SchedulerMilestoneData['slots'][number]
  post: PostLineupPost
}) {
  const t = useTranslations('analytics.workflows.chat')
  const roleStarLabel = t('milestonePostLineupPreviewRoleStar')
  const rolePuzzleLabel = t('milestonePostLineupPreviewRolePuzzle')

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-border/80 bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
          {schedulerSlotDisplayTime(slot)}
        </span>
        <Badge variant="outline" className={schedulerSlotClassName('post')}>
          {schedulerSlotTypeLabel('post')}
        </Badge>
      </div>
      <p className="mb-3 text-base font-semibold text-foreground">{post.title}</p>
      <PostLineupPostBadges post={post} />
      <div className="mt-3">
        <PostLineupSlides
          post={post}
          roleStarLabel={roleStarLabel}
          rolePuzzleLabel={rolePuzzleLabel}
        />
      </div>
    </>
  )
}

function SchedulerCalendarDateDetail({
  selectedDateIso,
  slots,
  postLineupPosts,
}: SchedulerCalendarDateDetailProps) {
  const t = useTranslations('analytics.workflows.chat')
  const selectedDaySlots = useMemo(
    () => schedulerSlotsForDateDetail(slots, selectedDateIso),
    [selectedDateIso, slots],
  )

  if (selectedDaySlots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
        {t('milestoneSchedulerPreviewDateEmpty')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedDaySlots.map((slot) => {
        const postDetail = resolveSchedulerPostDetail(slot, postLineupPosts)
        const isPostSlot = schedulerSlotKind(slot) === 'post'

        return (
          <article
            key={`${slot.date}-${slot.time}-${slot.title}`}
            className="rounded-lg border border-border/80 bg-background px-3 py-3 shadow-xs"
          >
            {isPostSlot && postDetail ? (
              <SchedulerPostSlotDetailCard slot={slot} post={postDetail} />
            ) : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-border/80 bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                    {schedulerSlotDisplayTime(slot)}
                  </span>
                  <Badge
                    variant="outline"
                    className={schedulerSlotClassName(schedulerSlotKind(slot))}
                  >
                    {schedulerSlotTypeLabel(schedulerSlotKind(slot))}
                  </Badge>
                </div>
                <p
                  className={cn(
                    'rounded-md border px-2 py-1 text-sm font-medium leading-relaxed',
                    schedulerSlotClassName(schedulerSlotKind(slot)),
                  )}
                >
                  {schedulerSlotDisplayTitle(slot)}
                </p>
                {isPostSlot ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('milestoneSchedulerPreviewPostDetailMissing')}
                  </p>
                ) : null}
              </>
            )}
          </article>
        )
      })}
    </div>
  )
}

export function SchedulerCalendar({
  windowStart,
  windowEnd,
  locale,
  slots = [],
  postLineupPosts,
  className,
}: SchedulerCalendarProps) {
  const t = useTranslations('analytics.workflows.chat')
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const initialWeekStart = useMemo(() => {
    const anchor = parseIsoDateOnly(windowStart)
    if (!anchor) {
      return windowStart
    }
    return clampWeekStart(startOfWeekMonday(anchor), windowStart, windowEnd)
  }, [windowEnd, windowStart])

  const initialMonthStart = useMemo(() => {
    const anchor = parseIsoDateOnly(windowStart)
    if (!anchor) {
      return windowStart
    }
    return clampMonthStart(startOfMonth(anchor), windowStart, windowEnd)
  }, [windowEnd, windowStart])

  const [viewMode, setViewMode] = useState<SchedulerCalendarViewMode>('month')
  const [weekStartIso, setWeekStartIso] = useState(initialWeekStart)
  const [monthStartIso, setMonthStartIso] = useState(initialMonthStart)
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null)
  const detailTitleId = useId()

  useEffect(() => {
    if (!isDesktop && viewMode === 'week') {
      setViewMode('month')
    }
  }, [isDesktop, viewMode])

  useEffect(() => {
    if (selectedDateIso && schedulerSlotsForDate(slots, selectedDateIso).length === 0) {
      setSelectedDateIso(null)
    }
  }, [selectedDateIso, slots])

  const weekRange = useMemo(
    () => formatSchedulerWeekRange(weekStartIso, locale),
    [locale, weekStartIso],
  )
  const monthLabel = useMemo(
    () => formatSchedulerMonthLabel(monthStartIso, locale),
    [locale, monthStartIso],
  )

  const canGoPrevious =
    viewMode === 'week'
      ? canGoToPreviousWeek(weekStartIso, windowStart, windowEnd)
      : canGoToPreviousMonth(monthStartIso, windowStart, windowEnd)
  const canGoNext =
    viewMode === 'week'
      ? canGoToNextWeek(weekStartIso, windowStart, windowEnd)
      : canGoToNextMonth(monthStartIso, windowStart, windowEnd)

  const previousLabel =
    viewMode === 'week'
      ? t('milestoneSchedulerPreviewWeekPrevious')
      : t('milestoneSchedulerPreviewMonthPrevious')
  const nextLabel =
    viewMode === 'week'
      ? t('milestoneSchedulerPreviewWeekNext')
      : t('milestoneSchedulerPreviewMonthNext')
  const switchToMonthLabel = t('milestoneSchedulerPreviewViewMonth')
  const switchToWeekLabel = t('milestoneSchedulerPreviewViewWeek')
  const viewToggleLabel = viewMode === 'week' ? switchToMonthLabel : switchToWeekLabel
  const selectedDateLabel = useMemo(
    () => (selectedDateIso ? formatSchedulerDateDetailLabel(selectedDateIso, locale) : ''),
    [locale, selectedDateIso],
  )

  const handleViewToggle = () => {
    if (viewMode === 'week') {
      setMonthStartIso(
        clampMonthStart(
          parseIsoDateOnly(monthStartIsoForWeek(weekStartIso)) ?? new Date(),
          windowStart,
          windowEnd,
        ),
      )
      setViewMode('month')
      return
    }

    setWeekStartIso(weekStartIsoForMonth(monthStartIso, weekStartIso, windowStart, windowEnd))
    setViewMode('week')
  }

  const calendarContent = (
    <>
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={!canGoPrevious}
          aria-label={previousLabel}
          onClick={() => {
            if (viewMode === 'week') {
              setWeekStartIso((current) =>
                clampWeekStart(
                  parseIsoDateOnly(previousWeekStartIso(current)) ?? new Date(),
                  windowStart,
                  windowEnd,
                ),
              )
              return
            }

            setMonthStartIso((current) =>
              clampMonthStart(
                parseIsoDateOnly(previousMonthStartIso(current)) ?? new Date(),
                windowStart,
                windowEnd,
              ),
            )
          }}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>

        <p className="min-w-0 flex-1 text-center text-sm font-medium text-foreground">
          {viewMode === 'week'
            ? t('milestoneSchedulerPreviewWeekRange', {
                start: weekRange.start,
                end: weekRange.end,
              })
            : monthLabel}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            disabled={!canGoNext}
            aria-label={nextLabel}
            onClick={() => {
              if (viewMode === 'week') {
                setWeekStartIso((current) =>
                  clampWeekStart(
                    parseIsoDateOnly(nextWeekStartIso(current)) ?? new Date(),
                    windowStart,
                    windowEnd,
                  ),
                )
                return
              }

              setMonthStartIso((current) =>
                clampMonthStart(
                  parseIsoDateOnly(nextMonthStartIso(current)) ?? new Date(),
                  windowStart,
                  windowEnd,
                ),
              )
            }}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>

          {isDesktop ? (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={viewToggleLabel}
                    onClick={handleViewToggle}
                  >
                    {viewMode === 'week' ? (
                      <CalendarDays aria-hidden className="size-4" />
                    ) : (
                      <Columns3 aria-hidden className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{viewToggleLabel}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      {isDesktop && viewMode === 'week' ? (
        <SchedulerCalendarWeekGrid
          weekStartIso={weekStartIso}
          windowStart={windowStart}
          windowEnd={windowEnd}
          locale={locale}
          slots={slots}
          onSlotClick={(slot) => {
            setSelectedDateIso(slot.date)
          }}
        />
      ) : isDesktop ? (
        <SchedulerCalendarMonthGrid
          monthStartIso={monthStartIso}
          windowStart={windowStart}
          windowEnd={windowEnd}
          locale={locale}
          slots={slots}
          onDayClick={(isoDate) => {
            setWeekStartIso(weekStartIsoForDay(isoDate, windowStart, windowEnd))
            setViewMode('week')
          }}
          onSlotClick={(slot) => {
            setSelectedDateIso(slot.date)
          }}
        />
      ) : (
        <SchedulerCalendarMonthList
          monthStartIso={monthStartIso}
          windowStart={windowStart}
          windowEnd={windowEnd}
          locale={locale}
          slots={slots}
          onSlotClick={(slot) => {
            setSelectedDateIso(slot.date)
          }}
        />
      )}
    </>
  )

  return (
    <div className={cn('flex min-h-0 w-full min-w-0 flex-1 flex-col', className)}>
      <MilestonePreviewListDetailShell
        selectedId={selectedDateIso}
        backLabel={t('milestoneSchedulerPreviewBackToCalendar')}
        detailTitleId={detailTitleId}
        detailTitle={selectedDateLabel}
        onBack={() => {
          setSelectedDateIso(null)
        }}
        list={calendarContent}
        detail={
          selectedDateIso ? (
            <SchedulerCalendarDateDetail
              selectedDateIso={selectedDateIso}
              slots={slots}
              postLineupPosts={postLineupPosts}
            />
          ) : null
        }
      />
    </div>
  )
}
