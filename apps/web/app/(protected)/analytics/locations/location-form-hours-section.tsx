'use client'

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

import { useLocationFormActions, useLocationFormState } from './location-form-context'
import type { OpeningHourRow } from './location-form-types'

function formatHoursSummary(row: OpeningHourRow, dayLabel: string, closedLabel: string): string {
  if (row.closed || !row.openTime || !row.closeTime) {
    return `${dayLabel} · ${closedLabel}`
  }
  return `${dayLabel} · ${row.openTime}–${row.closeTime}`
}

function LocationOpeningHourRow({ row, compact }: { row: OpeningHourRow; compact?: boolean }) {
  const t = useTranslations('analytics.branches.form')
  const { loading } = useLocationFormState()
  const { setRowClosed, updateOpeningHour } = useLocationFormActions()
  const switchId = `closed-${row.dayOfWeek}`
  const openId = `open-${row.dayOfWeek}`
  const closeId = `close-${row.dayOfWeek}`
  const dayLabel = t(`weekdays.${row.dayOfWeek}`)

  const controls = (
    <>
      <div className="flex items-center gap-2 sm:w-48 sm:shrink-0">
        <Switch
          id={switchId}
          checked={!row.closed}
          disabled={loading}
          onCheckedChange={(checked) => setRowClosed(row.dayOfWeek, checked !== true)}
          aria-label={t('openDaySwitchAria', { day: dayLabel })}
        />
        <FieldLabel htmlFor={switchId} className="cursor-pointer text-sm font-normal leading-none">
          {row.closed ? t('dayClosed') : t('dayOpen')}
        </FieldLabel>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
        <Field>
          <FieldLabel htmlFor={openId} className="text-xs text-muted-foreground">
            {t('opensAt')}
          </FieldLabel>
          <Input
            id={openId}
            type="time"
            value={row.openTime}
            disabled={loading || row.closed}
            aria-disabled={row.closed}
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
            disabled={loading || row.closed}
            aria-disabled={row.closed}
            onChange={(e) => updateOpeningHour(row.dayOfWeek, 'closeTime', e.target.value)}
          />
        </Field>
      </div>
    </>
  )

  if (compact) {
    return (
      <AccordionItem key={row.dayOfWeek} value={row.dayOfWeek}>
        <AccordionTrigger className="py-3 text-sm hover:no-underline">
          {formatHoursSummary(row, dayLabel, t('dayClosed'))}
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3 pb-3">{controls}</AccordionContent>
      </AccordionItem>
    )
  }

  return (
    <div
      key={row.dayOfWeek}
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

export function LocationHoursSection() {
  const t = useTranslations('analytics.branches.form')
  const { loading, openingHours } = useLocationFormState()
  const { presetWeekdaysOnly, presetCopyMondayToWeekdays, presetAllClosed } =
    useLocationFormActions()

  return (
    <TabsContent value="hours" className="flex flex-col gap-4">
      <FieldSet>
        <FieldLegend variant="label">{t('openingHoursTitle')}</FieldLegend>
        <FieldDescription>{t('openingHoursDescription')}</FieldDescription>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t('openingHoursPresetsAria')}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={presetWeekdaysOnly}
          >
            {t('presetWeekdays')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={presetCopyMondayToWeekdays}
          >
            {t('presetCopyMonday')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={presetAllClosed}
          >
            {t('presetAllClosed')}
          </Button>
        </div>

        <Accordion type="single" collapsible className="lg:hidden">
          {openingHours.map((row) => (
            <LocationOpeningHourRow compact key={row.dayOfWeek} row={row} />
          ))}
        </Accordion>

        <div className="hidden flex-col gap-3 lg:flex">
          {openingHours.map((row) => (
            <LocationOpeningHourRow key={row.dayOfWeek} row={row} />
          ))}
        </div>
      </FieldSet>
    </TabsContent>
  )
}
