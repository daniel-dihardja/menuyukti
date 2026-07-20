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
import { ImageIcon } from 'lucide-react'
import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'

import {
  clearTrailingMentionTrigger,
  parseMentionAtEnd,
} from '@/lib/chat/post-creator-chat-mention'

export type PostCreatorPreviewMentionCandidate = {
  kind: 'post' | 'photo'
  name: string
  url: string
  label: string
}

export type PostCreatorChatPreviewMentionProps = {
  value: string
  onValueChange: (next: string) => void
  candidate: PostCreatorPreviewMentionCandidate | null
  disabled?: boolean
  mentionAriaLabel: string
  mentionEmptyLabel: string
  onSelectPreview: (candidate: PostCreatorPreviewMentionCandidate) => void
  children: ReactNode
}

export function PostCreatorChatPreviewMention({
  value,
  onValueChange,
  candidate,
  disabled = false,
  mentionAriaLabel,
  mentionEmptyLabel,
  onSelectPreview,
  children,
}: PostCreatorChatPreviewMentionProps) {
  const mention = parseMentionAtEnd(value)
  const filterQuery = mention?.filterQuery ?? ''
  const candidateMatches =
    candidate != null &&
    (filterQuery.length === 0 ||
      candidate.label.toLowerCase().includes(filterQuery) ||
      candidate.name.toLowerCase().includes(filterQuery))
  const menuOpen = mention !== null && !disabled
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!menuOpen) {
      setActiveIndex(0)
      return
    }
    setActiveIndex(0)
  }, [menuOpen, candidateMatches])

  const handleSelect = useCallback(() => {
    if (!candidate || !candidateMatches) return
    onSelectPreview(candidate)
    onValueChange(clearTrailingMentionTrigger(value))
  }, [candidate, candidateMatches, onSelectPreview, onValueChange, value])

  const handleKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.nativeEvent.isComposing || !menuOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onValueChange(clearTrailingMentionTrigger(value))
        return
      }

      if (!candidateMatches) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(0)
        return
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSelect()
      }
    },
    [candidateMatches, handleSelect, menuOpen, onValueChange, value],
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
          <PopoverTitle>{mentionAriaLabel}</PopoverTitle>
        </PopoverHeader>
        <Command shouldFilter={false}>
          <CommandList>
            {candidateMatches && candidate ? (
              <CommandGroup aria-label={mentionAriaLabel}>
                <CommandItem
                  className={cn(
                    'flex w-full items-center gap-2',
                    activeIndex === 0 && 'bg-accent text-accent-foreground',
                  )}
                  onSelect={handleSelect}
                  value={candidate.name}
                >
                  {candidate.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                    <img
                      alt=""
                      className="size-8 shrink-0 rounded object-cover"
                      src={candidate.url}
                    />
                  ) : (
                    <ImageIcon className="size-8 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="truncate text-sm">{candidate.label}</span>
                </CommandItem>
              </CommandGroup>
            ) : (
              <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                {mentionEmptyLabel}
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
