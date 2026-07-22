'use client'

import * as React from 'react'
import { format, parse } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { Calendar } from '@workspace/ui/components/calendar'
import { Label } from '@workspace/ui/components/label'
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

type DateTimePickerProps = {
  /** Local datetime `YYYY-MM-DDTHH:mm`, or empty/undefined when unset. */
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  timeLabel?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function splitValue(value: string | undefined): { date: string; hour: string; minute: string } {
  if (!value?.trim()) return { date: '', hour: '09', minute: '00' }
  const [date = '', timePart = '09:00'] = value.split('T')
  const [hour = '09', minute = '00'] = timePart.slice(0, 5).split(':')
  return {
    date,
    hour: hour.padStart(2, '0'),
    minute: minute.padStart(2, '0'),
  }
}

function toSelectedDate(date: string): Date | undefined {
  if (!date) return undefined
  const parsed = parse(date, 'yyyy-MM-dd', new Date())
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function joinValue(date: string, hour: string, minute: string): string {
  if (!date) return ''
  return `${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

function DateTimePicker({
  value,
  onChange,
  disabled,
  placeholder = 'Pick date and time',
  timeLabel = 'Time',
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { date, hour, minute } = splitValue(value)
  const selected = toSelectedDate(date)

  function handleSelect(next: Date | undefined) {
    if (!next) return
    onChange(joinValue(toISODate(next), hour, minute))
  }

  const display = selected != null ? `${format(selected, 'PPP')} · ${hour}:${minute}` : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start overflow-hidden text-left font-normal',
            !selected && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          <span className="truncate">{display ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="flex items-center gap-2 border-t p-3">
          <Label className="shrink-0 text-xs">{timeLabel}</Label>
          <Select
            disabled={disabled || !date}
            onValueChange={(nextHour) => onChange(joinValue(date, nextHour, minute))}
            value={date ? hour : undefined}
          >
            <SelectTrigger aria-label={`${timeLabel} hour`} className="h-8 w-[4.5rem]">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent position="popper">
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-sm">:</span>
          <Select
            disabled={disabled || !date}
            onValueChange={(nextMinute) => onChange(joinValue(date, hour, nextMinute))}
            value={date ? minute : undefined}
          >
            <SelectTrigger aria-label={`${timeLabel} minute`} className="h-8 w-[4.5rem]">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent position="popper">
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateTimePicker }
