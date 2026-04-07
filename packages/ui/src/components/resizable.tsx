'use client'

import * as React from 'react'
import { GripVertical } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'

import { cn } from '@workspace/ui/lib/utils'

const ResizablePanelGroup = ({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group className={cn('flex h-full w-full min-h-0', className)} orientation={orientation} {...props} />
)

const ResizablePanel = Panel

const ResizableHandle = ({
  className,
  withHandle,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) => (
  <Separator
    className={cn(
      'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
      className,
    )}
    {...props}
  >
    {withHandle ? (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="size-2.5" />
      </div>
    ) : null}
  </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
