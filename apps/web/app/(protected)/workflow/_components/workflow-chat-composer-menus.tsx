'use client'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@workspace/ui/components/command'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@workspace/ui/components/popover'
import { cn } from '@workspace/ui/lib/utils'
import { useWorkflowChatMentionItems } from './workflow-chat-mention-context'
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

export type MilestoneMentionItem = {
  id: string
  title: string
}

export type WorkflowChatComposerMenusProps = {
  value: string
  onValueChange: (next: string) => void
  commands: SlashCommandDefinition[]
  onSelectSlashCommand: (command: string) => void
  slashAriaLabel: string
  onSelectMention: (milestoneId: string) => void
  mentionAriaLabel: string
  mentionEmptyLabel: string
  children: ReactNode
}

export function WorkflowChatComposerMenus({
  value,
  onValueChange,
  commands,
  onSelectSlashCommand,
  slashAriaLabel,
  onSelectMention,
  mentionAriaLabel,
  mentionEmptyLabel,
  children,
}: WorkflowChatComposerMenusProps) {
  const { milestones, selectedMilestoneId, mentionMenusDisabled } = useWorkflowChatMentionItems()
  const otherMilestones = useMemo(
    () =>
      milestones.filter((m) =>
        selectedMilestoneId === null ? true : m.id !== selectedMilestoneId,
      ),
    [milestones, selectedMilestoneId],
  )

  const slashQuery = value.startsWith('/') ? value.slice(1).toLowerCase() : ''
  const filteredSlash = useMemo(
    () =>
      value.startsWith('/')
        ? commands.filter((c) => c.id.toLowerCase().startsWith(slashQuery))
        : [],
    [commands, slashQuery, value],
  )

  /** trimEnd so `@Title ` after picking still matches; avoid trim() stripping intentional leading spaces in rare cases. */
  const mentionFilterQuery = value.startsWith('@') ? value.slice(1).toLowerCase().trimEnd() : ''
  const filteredMentions = useMemo(() => {
    if (!value.startsWith('@')) {
      return []
    }
    return otherMilestones.filter((m) => m.title.toLowerCase().includes(mentionFilterQuery))
  }, [mentionFilterQuery, otherMilestones, value])

  const slashMenuOpen = value.startsWith('/') && filteredSlash.length > 0
  /** Hide popover once the typed tail is not a mention prefix (e.g. `@Brief what is…`) so CommandEmpty does not flash. */
  const mentionMenuOpen =
    value.startsWith('@') &&
    !mentionMenusDisabled &&
    otherMilestones.length > 0 &&
    (filteredMentions.length > 0 || mentionFilterQuery.length === 0)

  const menuOpen = slashMenuOpen || mentionMenuOpen
  const panelAriaLabel = slashMenuOpen ? slashAriaLabel : mentionAriaLabel

  const [slashActiveIndex, setSlashActiveIndex] = useState(0)
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0)

  useEffect(() => {
    if (!slashMenuOpen) {
      setSlashActiveIndex(0)
      return
    }
    setSlashActiveIndex((prev) => Math.min(prev, filteredSlash.length - 1))
  }, [filteredSlash.length, slashMenuOpen])

  useEffect(() => {
    if (!mentionMenuOpen) {
      setMentionActiveIndex(0)
      return
    }
    if (filteredMentions.length === 0) {
      setMentionActiveIndex(0)
      return
    }
    setMentionActiveIndex((prev) => Math.min(prev, filteredMentions.length - 1))
  }, [filteredMentions.length, mentionMenuOpen])

  const handleKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }

      if (mentionMenuOpen) {
        if (filteredMentions.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setMentionActiveIndex((i) => (i + 1) % filteredMentions.length)
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setMentionActiveIndex(
              (i) => (i - 1 + filteredMentions.length) % filteredMentions.length,
            )
            return
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            onValueChange('')
            return
          }
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const m = filteredMentions[mentionActiveIndex]
            if (m) {
              onSelectMention(m.id)
            }
            return
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onValueChange('')
        }
        return
      }

      if (slashMenuOpen && filteredSlash.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSlashActiveIndex((i) => (i + 1) % filteredSlash.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSlashActiveIndex((i) => (i - 1 + filteredSlash.length) % filteredSlash.length)
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          onValueChange('')
          return
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          const cmd = filteredSlash[slashActiveIndex]
          if (cmd) {
            onSelectSlashCommand(`/${cmd.id}`)
          }
        }
      }
    },
    [
      filteredMentions,
      filteredSlash,
      mentionActiveIndex,
      mentionMenuOpen,
      onSelectMention,
      onSelectSlashCommand,
      onValueChange,
      slashActiveIndex,
      slashMenuOpen,
    ],
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
        className="w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-trigger-width)] overflow-hidden p-0 lg:w-auto lg:max-w-md lg:min-w-56"
        onOpenAutoFocus={(ev) => ev.preventDefault()}
        side="top"
      >
        <PopoverHeader className="sr-only">
          <PopoverTitle>{panelAriaLabel}</PopoverTitle>
        </PopoverHeader>
        <Command shouldFilter={false}>
          <CommandList>
            {slashMenuOpen ? (
              <CommandGroup aria-label={slashAriaLabel}>
                {filteredSlash.map((cmd, i) => (
                  <CommandItem
                    key={cmd.id}
                    className={cn(
                      'flex w-full flex-col items-start gap-1',
                      i === slashActiveIndex && 'bg-accent text-accent-foreground',
                    )}
                    onSelect={() => onSelectSlashCommand(`/${cmd.id}`)}
                    value={cmd.id}
                  >
                    <span className="font-medium">/{cmd.label}</span>
                    <span className="truncate text-muted-foreground">{cmd.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <>
                {filteredMentions.length > 0 ? (
                  <CommandGroup aria-label={mentionAriaLabel}>
                    {filteredMentions.map((m, i) => (
                      <CommandItem
                        key={m.id}
                        className={cn(
                          'w-full items-start',
                          i === mentionActiveIndex && 'bg-accent text-accent-foreground',
                        )}
                        onSelect={() => onSelectMention(m.id)}
                        value={m.title}
                      >
                        <span className="font-medium">{m.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : (
                  <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                    {mentionEmptyLabel}
                  </CommandEmpty>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
