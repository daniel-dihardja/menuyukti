'use client'

import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from '@workspace/ui/components/ai-elements/prompt-input'
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
  triggerClassName?: string
  /** Borderless matches PromptInput selects (e.g. advisor workspace rail). */
  variant?: 'default' | 'borderless'
  /** When set, controls the select instead of AnalyticsProvider location state. */
  value?: number | null
  onValueChange?: (id: number | null) => void
  disabled?: boolean
}

export function LocationSelect({
  branches,
  placeholder = 'Select location',
  id,
  label,
  description,
  className,
  triggerClassName,
  variant = 'default',
  value,
  onValueChange,
  disabled = false,
}: LocationSelectProps) {
  const analytics = useAnalytics()
  const locationId = value !== undefined ? value : analytics.locationId
  const setLocationId = onValueChange ?? analytics.setLocationId
  const selectId = id ?? 'location-select'
  const descriptionId = description ? `${selectId}-description` : undefined
  const selectValue = locationId !== null ? String(locationId) : undefined
  const handleValueChange = (val: string) => setLocationId(val ? Number(val) : null)

  const borderless = variant === 'borderless'

  return (
    <Field className={cn('flex max-w-xs flex-col gap-2', className)}>
      {label ? <FieldLabel htmlFor={selectId}>{label}</FieldLabel> : null}
      {borderless ? (
        <PromptInputSelect
          value={selectValue}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <PromptInputSelectTrigger
            id={selectId}
            aria-label={label ?? placeholder}
            aria-describedby={descriptionId}
            className={triggerClassName}
          >
            <PromptInputSelectValue placeholder={placeholder} />
          </PromptInputSelectTrigger>
          <PromptInputSelectContent>
            {branches.map((branch) => (
              <PromptInputSelectItem key={branch.id} value={String(branch.id)}>
                {branch.name}
              </PromptInputSelectItem>
            ))}
          </PromptInputSelectContent>
        </PromptInputSelect>
      ) : (
        <Select value={selectValue} onValueChange={handleValueChange} disabled={disabled}>
          <SelectTrigger
            id={selectId}
            aria-label={label ?? placeholder}
            aria-describedby={descriptionId}
            className={triggerClassName}
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
      )}
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
    </Field>
  )
}
