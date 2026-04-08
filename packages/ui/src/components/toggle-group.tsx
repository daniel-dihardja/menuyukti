'use client'

import * as React from 'react'
import { ToggleGroup as ToggleGroupNamespace } from 'radix-ui'

import { cn } from '@workspace/ui/lib/utils'

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupNamespace.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupNamespace.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupNamespace.Root
    ref={ref}
    className={cn('flex flex-wrap items-center justify-start gap-2', className)}
    {...props}
  />
))
ToggleGroup.displayName = 'ToggleGroup'

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupNamespace.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupNamespace.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupNamespace.Item
    ref={ref}
    className={cn(
      'inline-flex min-h-9 shrink-0 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium whitespace-nowrap text-foreground shadow-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
      className,
    )}
    {...props}
  />
))
ToggleGroupItem.displayName = 'ToggleGroupItem'

export { ToggleGroup, ToggleGroupItem }
