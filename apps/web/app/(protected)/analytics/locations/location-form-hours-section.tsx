'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { Button } from '@workspace/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'
import { TabsContent } from '@workspace/ui/components/tabs'
import { cn } from '@workspace/ui/lib/utils'

import { useLocationFormActions, useLocationFormState } from './location-form-context'
import {
  classifyOpeningHoursSummary,
  type OpeningHourRow,
  type Weekday,
} from './location-form-types'

function formatHoursSummary(row: OpeningHourRow, dayLabel: string, closedLabel: string): string {
  if (row.closed || !row.openTime || !row.closeTime) {
    return `${dayLabel} · ${closedLabel}`
  }
  return `${dayLabel} · ${row.openTime}–${row.closeTime}`
}

function LocationOpeningHourRow({
  row,
  compact,
  autoFocusOpen,
}: {
  row: OpeningHourRow
  compact?: boolean
  autoFocusOpen?: boolean
}) {
  const t = useTranslations('analytics.branches.form')
  const { loading } = useLocationFormState()
  const { setRowClosed, updateOpeningHour } = useLocationFormActions()
  const switchId = `closed-${row.dayOfWeek}`
  const openId = `open-${row.dayOfWeek}`
  const closeId = `close-${row.dayOfWeek}`
  const dayLabel = t(`weekdays.${row.dayOfWeek}`)
  const openInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!autoFocusOpen || row.closed) return
    openInputRef.current?.focus()
    openInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [autoFocusOpen, row.closed])

  const controls = (
    <>
      <div
        className={cn(
          'flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 sm:w-52 sm:shrink-0',
          loading && 'opacity-50',
        )}
      >
        <Switch
          id={switchId}
          checked={!row.closed}
          disabled={loading}
          aria-label={t('openDaySwitchAria', { day: dayLabel })}
          onCheckedChange={(open) => {
            if (loading) return
            setRowClosed(row.dayOfWeek, !open)
          }}
        />
        <label
          htmlFor={switchId}
          className={cn(
            'text-sm font-normal leading-none',
            loading ? 'pointer-events-none' : 'cursor-pointer',
          )}
        >
          {row.closed ? t('dayClosed') : t('dayOpen')}
        </label>
      </div>
      {!row.closed ? (
        <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
          <Field>
            <FieldLabel htmlFor={openId} className="text-xs text-muted-foreground">
              {t('opensAt')}
            </FieldLabel>
            <Input
              ref={openInputRef}
              id={openId}
              type="time"
              value={row.openTime}
              disabled={loading}
              className="h-11 text-base md:h-9 md:text-sm"
              onChange={(e) => updateOpeningHour(row.dayOfWeek, 'openTime', e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={closeId} className="text-xs text-muted-foreground">
              {t('closesAt')}
            </FieldLabel>
            <Input
              id={closeId}
              type="time"
              value={row.closeTime}
              disabled={loading}
              className="h-11 text-base md:h-9 md:text-sm"
              onChange={(e) => updateOpeningHour(row.dayOfWeek, 'closeTime', e.target.value)}
            />
          </Field>
        </div>
      ) : null}
    </>
  )

  if (compact) {
    return (
      <AccordionItem value={row.dayOfWeek}>
        <AccordionTrigger className="min-h-11 py-3 text-sm hover:no-underline">
          {formatHoursSummary(row, dayLabel, t('dayClosed'))}
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3 pb-3">{controls}</AccordionContent>
      </AccordionItem>
    )
  }

  return (
    <div
      role="group"
      aria-labelledby={`${switchId}-label`}
      className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:gap-4"
    >
      <p id={`${switchId}-label`} className="min-w-[6.5rem] font-medium capitalize sm:shrink-0">
        {dayLabel}
      </p>
      {controls}
    </div>
  )
}

function HoursSummaryText({ openingHours }: { openingHours: OpeningHourRow[] }) {
  const t = useTranslations('analytics.branches.form')
  const summary = classifyOpeningHoursSummary(openingHours)
  if (summary.kind === 'closedAll') return t('hoursSummaryClosedAll')
  if (summary.kind === 'weekdays' && summary.openTime && summary.closeTime) {
    return t('hoursSummaryWeekdays', { open: summary.openTime, close: summary.closeTime })
  }
  if (summary.kind === 'everyDay' && summary.openTime && summary.closeTime) {
    return t('hoursSummaryEveryDay', { open: summary.openTime, close: summary.closeTime })
  }
  return t('hoursSummaryCustom')
}

function LocationHoursFields({
  focusDay,
  forceEditorOpen,
}: {
  focusDay?: Weekday | null
  forceEditorOpen?: boolean
}) {
  const t = useTranslations('analytics.branches.form')
  const { loading, openingHours } = useLocationFormState()
  const [editorOpen, setEditorOpen] = useState(() => Boolean(forceEditorOpen || focusDay))
  const [accordionValue, setAccordionValue] = useState<string | undefined>(focusDay ?? undefined)
  const sectionRef = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    if (forceEditorOpen || focusDay) {
      setEditorOpen(true)
    }
    if (focusDay) {
      setAccordionValue(focusDay)
    }
  }, [forceEditorOpen, focusDay])

  useEffect(() => {
    if (!focusDay) return
    sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [focusDay])

  return (
    <FieldSet ref={sectionRef} id="location-hours-section">
      <FieldLegend variant="label">{t('openingHoursTitle')}</FieldLegend>
      <FieldDescription>{t('openingHoursDescription')}</FieldDescription>

      <div className="rounded-lg border border-border/80 bg-muted/10 p-3 sm:p-4">
        <p className="text-sm font-medium">
          <HoursSummaryText openingHours={openingHours} />
        </p>
        <Button
          type="button"
          variant="link"
          className="mt-1 h-auto touch-manipulation px-0 py-1 text-sm"
          disabled={loading}
          onClick={() => setEditorOpen((open) => !open)}
          aria-expanded={editorOpen}
        >
          {editorOpen ? t('hoursSummaryHide') : t('hoursSummaryEdit')}
        </Button>
      </div>

      {editorOpen ? (
        <>
          <Accordion
            type="single"
            collapsible
            className="lg:hidden"
            value={accordionValue ?? ''}
            onValueChange={(value) => setAccordionValue(value || undefined)}
          >
            {openingHours.map((row) => (
              <LocationOpeningHourRow
                compact
                key={row.dayOfWeek}
                row={row}
                autoFocusOpen={focusDay === row.dayOfWeek}
              />
            ))}
          </Accordion>

          <div className="hidden flex-col gap-3 lg:flex">
            {openingHours.map((row) => (
              <LocationOpeningHourRow
                key={row.dayOfWeek}
                row={row}
                autoFocusOpen={focusDay === row.dayOfWeek}
              />
            ))}
          </div>
        </>
      ) : null}
    </FieldSet>
  )
}

export function LocationHoursSection({
  focusDay,
  forceEditorOpen,
}: {
  focusDay?: Weekday | null
  forceEditorOpen?: boolean
} = {}) {
  const { mode } = useLocationFormState()
  const fields = <LocationHoursFields focusDay={focusDay} forceEditorOpen={forceEditorOpen} />

  if (mode === 'create') {
    return <div className="flex flex-col gap-4">{fields}</div>
  }

  return (
    <TabsContent value="hours" className="flex flex-col gap-4">
      {fields}
    </TabsContent>
  )
}
