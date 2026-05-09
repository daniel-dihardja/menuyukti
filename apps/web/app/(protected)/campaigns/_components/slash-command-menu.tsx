'use client'

import { Command, CommandGroup, CommandItem, CommandList } from '@workspace/ui/components/command'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@workspace/ui/components/popover'
import { cn } from '@workspace/ui/lib/utils'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

export type SlashCommandDefinition = {
  id: string
  label: string
  description: string
}

export type SlashCommandMenuProps = {
  value: string
  onValueChange: (next: string) => void
  onSelectCommand: (command: string) => void
  commands: SlashCommandDefinition[]
  ariaLabel: string
  children: ReactNode
}

export function SlashCommandMenu({
  value,
  onValueChange,
  onSelectCommand,
  commands,
  ariaLabel,
  children,
}: SlashCommandMenuProps) {
  const query = value.startsWith('/') ? value.slice(1).toLowerCase() : ''
  const filtered = useMemo(
    () =>
      value.startsWith('/') ? commands.filter((c) => c.id.toLowerCase().startsWith(query)) : [],
    [commands, query, value],
  )

  const menuOpen = value.startsWith('/') && filtered.length > 0
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!menuOpen) {
      setActiveIndex(0)
      return
    }
    setActiveIndex((prev) => Math.min(prev, filtered.length - 1))
  }, [menuOpen, filtered])

  const handleKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!menuOpen || filtered.length === 0) {
        return
      }
      if (e.nativeEvent.isComposing) {
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % filtered.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onValueChange('')
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const cmd = filtered[activeIndex]
        if (cmd) {
          onSelectCommand(`/${cmd.id}`)
        }
      }
    },
    [activeIndex, filtered, menuOpen, onSelectCommand, onValueChange],
  )

  return (
    <Popover open={menuOpen}>
      <PopoverAnchor asChild>
        <div className="relative min-w-0 w-full" onKeyDownCapture={handleKeyDownCapture}>
          {children}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="max-w-md min-w-56 overflow-hidden p-0"
        onOpenAutoFocus={(ev) => ev.preventDefault()}
        side="top"
      >
        <PopoverHeader className="sr-only">
          <PopoverTitle>{ariaLabel}</PopoverTitle>
        </PopoverHeader>
        <Command shouldFilter={false}>
          <CommandList>
            <CommandGroup aria-label={ariaLabel}>
              {filtered.map((cmd, i) => (
                <CommandItem
                  key={cmd.id}
                  className={cn(i === activeIndex && 'bg-accent text-accent-foreground')}
                  onSelect={() => onSelectCommand(`/${cmd.id}`)}
                  value={cmd.id}
                >
                  <span className="font-medium">/{cmd.label}</span>
                  <span className="truncate text-muted-foreground">{cmd.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
