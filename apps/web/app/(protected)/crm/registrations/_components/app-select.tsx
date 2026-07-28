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

type AppOption = {
  id: number
  title: string
}

interface AppSelectProps {
  apps: AppOption[]
  value: number | null
  onValueChange: (appId: number | null) => void
  placeholder?: string
  id?: string
  label?: string
  description?: string
  className?: string
}

export function AppSelect({
  apps,
  value,
  onValueChange,
  placeholder = 'Select app',
  id,
  label,
  description,
  className,
}: AppSelectProps) {
  const selectId = id ?? 'crm-app-select'
  const descriptionId = description ? `${selectId}-description` : undefined

  return (
    <Field className={cn('max-w-xs space-y-2', className)}>
      {label ? <FieldLabel htmlFor={selectId}>{label}</FieldLabel> : null}
      <Select
        value={value !== null ? String(value) : undefined}
        onValueChange={(val) => onValueChange(val ? Number(val) : null)}
      >
        <SelectTrigger
          id={selectId}
          aria-label={label ?? placeholder}
          aria-describedby={descriptionId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {apps.map((app) => (
            <SelectItem key={app.id} value={String(app.id)}>
              {app.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
    </Field>
  )
}
