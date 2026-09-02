'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Field, FieldDescription, FieldLabel } from '@workspace/ui/components/field'
import { cn } from '@workspace/ui/lib/utils'
import { useAnalytics } from '../use-analytics'

type Branch = {
  id: number
  name: string
}

interface LocationSelectProps {
  branches: Branch[]
  placeholder?: string
  id?: string
  label?: string
  description?: string
  className?: string
  /** When set, controls the select instead of AnalyticsProvider location state. */
  value?: number | null
  onValueChange?: (id: number | null) => void
}

export function LocationSelect({
  branches,
  placeholder = 'Select location',
  id,
  label,
  description,
  className,
  value,
  onValueChange,
}: LocationSelectProps) {
  const analytics = useAnalytics()
  const locationId = value !== undefined ? value : analytics.locationId
  const setLocationId = onValueChange ?? analytics.setLocationId
  const selectId = id ?? 'location-select'
  const descriptionId = description ? `${selectId}-description` : undefined

  return (
    <Field className={cn('flex max-w-xs flex-col gap-2', className)}>
      {label ? <FieldLabel htmlFor={selectId}>{label}</FieldLabel> : null}
      <Select
        value={locationId !== null ? String(locationId) : undefined}
        onValueChange={(val) => setLocationId(val ? Number(val) : null)}
      >
        <SelectTrigger
          id={selectId}
          aria-label={label ?? placeholder}
          aria-describedby={descriptionId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={String(branch.id)}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
    </Field>
  )
}
