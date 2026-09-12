'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { Calendar } from '@workspace/ui/components/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover'

type DatePickerProps = {
  id?: string
  value?: string
  onChange: (date: string) => void
  disabled?: boolean
  placeholder?: string
  /** Inclusive ISO date (`yyyy-MM-dd`) — days before are disabled. */
  min?: string
  /** Inclusive ISO date (`yyyy-MM-dd`) — days after are disabled. */
  max?: string
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  try {
    return parseISO(value)
  } catch {
    return undefined
  }
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function DatePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = 'Pick a date',
  min,
  max,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = toDate(value)
  const minDate = toDate(min)
  const maxDate = toDate(max)

  function handleSelect(date: Date | undefined) {
    if (date) {
      onChange(toISODate(date))
      setOpen(false)
    }
  }

  const disabledMatchers = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
          )}
        >
          <CalendarIcon data-icon="inline-start" />
          {selected ? format(selected, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? minDate}
          onSelect={handleSelect}
          disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
