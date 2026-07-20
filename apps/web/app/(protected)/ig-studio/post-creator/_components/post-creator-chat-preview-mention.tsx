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
import { ImageIcon, Loader2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import {
  clearTrailingMentionTrigger,
  filterMediaForMention,
  matchesMentionFilter,
  parseMentionAtEnd,
} from '@/lib/chat/post-creator-chat-mention'
import { formatMediaMentionLabel } from '@/lib/chat/workflow-chat-media-mention'
import { loadMedia, type MediaCatalogItem } from '@/lib/media/client-api'

export type PostCreatorPreviewMentionCandidate = {
  kind: 'post' | 'photo'
  name: string
  url: string
  label: string
}

type MentionMenuEntry =
  | { kind: 'preview'; candidate: PostCreatorPreviewMentionCandidate }
  | { kind: 'media'; item: MediaCatalogItem }

export type PostCreatorChatPreviewMentionProps = {
  value: string
  onValueChange: (next: string) => void
  candidate: PostCreatorPreviewMentionCandidate | null
  excludeNames?: ReadonlySet<string>
  disabled?: boolean
  mentionAriaLabel: string
  mentionEmptyLabel: string
  previewGroupLabel: string
  mediaGroupLabel: string
  mediaAriaLabel: string
  mediaLoadingLabel: string
  mediaEmptyLabel: string
  onSelectPreview: (candidate: PostCreatorPreviewMentionCandidate) => void
  onSelectMedia: (item: MediaCatalogItem) => void
  children: ReactNode
}

export function PostCreatorChatPreviewMention({
  value,
  onValueChange,
  candidate,
  excludeNames,
  disabled = false,
  mentionAriaLabel,
  mentionEmptyLabel,
  previewGroupLabel,
  mediaGroupLabel,
  mediaAriaLabel,
  mediaLoadingLabel,
  mediaEmptyLabel,
  onSelectPreview,
  onSelectMedia,
  children,
}: PostCreatorChatPreviewMentionProps) {
  const mention = parseMentionAtEnd(value)
  const filterQuery = mention?.filterQuery ?? ''
  const menuOpen = mention !== null && !disabled

  const [mediaItems, setMediaItems] = useState<MediaCatalogItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaLoadAttempted, setMediaLoadAttempted] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const commandListRef = useRef<HTMLDivElement>(null)

  const candidateMatches =
    candidate != null && matchesMentionFilter(filterQuery, candidate.name, candidate.label)

  const filteredMedia = useMemo(
    () => filterMediaForMention(mediaItems, filterQuery, excludeNames),
    [excludeNames, filterQuery, mediaItems],
  )

  const flatEntries = useMemo((): MentionMenuEntry[] => {
    const entries: MentionMenuEntry[] = []
    if (candidateMatches && candidate) {
      entries.push({ kind: 'preview', candidate })
    }
    for (const item of filteredMedia) {
      entries.push({ kind: 'media', item })
    }
    return entries
  }, [candidate, candidateMatches, filteredMedia])

  useEffect(() => {
    if (!menuOpen) {
      setActiveIndex(0)
      return
    }

    let cancelled = false
    setMediaLoading(true)
    void loadMedia()
      .then((list) => {
        if (!cancelled) {
          setMediaItems(list)
          setMediaLoadAttempted(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMediaItems([])
          setMediaLoadAttempted(true)
        }
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) {
      setActiveIndex(0)
      return
    }
    if (flatEntries.length === 0) {
      setActiveIndex(0)
      return
    }
    setActiveIndex((prev) => Math.min(prev, flatEntries.length - 1))
  }, [flatEntries.length, menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const list = commandListRef.current
    if (!list) return
    const active = list.querySelector<HTMLElement>('[data-post-creator-mention-active="true"]')
    if (!active) return
    const listRect = list.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    if (activeRect.bottom > listRect.bottom) {
      list.scrollTop += activeRect.bottom - listRect.bottom
    } else if (activeRect.top < listRect.top) {
      list.scrollTop -= listRect.top - activeRect.top
    }
  }, [activeIndex, menuOpen])

  const selectEntry = useCallback(
    (entry: MentionMenuEntry) => {
      if (entry.kind === 'preview') {
        onSelectPreview(entry.candidate)
      } else {
        onSelectMedia(entry.item)
      }
      onValueChange(clearTrailingMentionTrigger(value))
    },
    [onSelectMedia, onSelectPreview, onValueChange, value],
  )

  const handleKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.nativeEvent.isComposing || !menuOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onValueChange(clearTrailingMentionTrigger(value))
        return
      }

      if (flatEntries.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % flatEntries.length)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + flatEntries.length) % flatEntries.length)
        return
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const entry = flatEntries[activeIndex]
        if (entry) selectEntry(entry)
      }
    },
    [activeIndex, flatEntries, menuOpen, onValueChange, selectEntry, value],
  )

  const showMediaLoading = mediaLoading && filteredMedia.length === 0
  const showEmpty =
    !showMediaLoading && flatEntries.length === 0 && (!mediaLoading || mediaLoadAttempted)

  const emptyLabel =
    mediaLoadAttempted && mediaItems.length === 0 && !candidateMatches
      ? mediaEmptyLabel
      : mentionEmptyLabel

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
          <CommandList ref={commandListRef}>
            {showEmpty ? (
              <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                {emptyLabel}
              </CommandEmpty>
            ) : (
              <>
                {candidateMatches && candidate ? (
                  <CommandGroup heading={previewGroupLabel} aria-label={previewGroupLabel}>
                    <CommandItem
                      className={cn(
                        'flex w-full items-center gap-2',
                        activeIndex === 0 && 'bg-accent text-accent-foreground',
                      )}
                      data-post-creator-mention-active={activeIndex === 0 ? 'true' : undefined}
                      onSelect={() => selectEntry({ kind: 'preview', candidate })}
                      value={`preview-${candidate.name}`}
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
                ) : null}
                {showMediaLoading ? (
                  <CommandGroup heading={mediaGroupLabel}>
                    <div className="flex items-center gap-2 px-2 py-3 text-muted-foreground text-sm">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {mediaLoadingLabel}
                    </div>
                  </CommandGroup>
                ) : null}
                {filteredMedia.length > 0 ? (
                  <CommandGroup heading={mediaGroupLabel} aria-label={mediaAriaLabel}>
                    {filteredMedia.map((item, mediaIndex) => {
                      const flatIndex = (candidateMatches ? 1 : 0) + mediaIndex
                      const label = formatMediaMentionLabel(item.name)
                      return (
                        <CommandItem
                          key={item.name}
                          className={cn(
                            'flex w-full items-center gap-2',
                            activeIndex === flatIndex && 'bg-accent text-accent-foreground',
                          )}
                          data-post-creator-mention-active={
                            activeIndex === flatIndex ? 'true' : undefined
                          }
                          onSelect={() => selectEntry({ kind: 'media', item })}
                          value={`media-${item.name}`}
                        >
                          {item.url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                            <img
                              alt=""
                              className="size-8 shrink-0 rounded object-cover"
                              height={32}
                              src={item.url}
                              width={32}
                            />
                          ) : (
                            <ImageIcon
                              className="size-8 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                          )}
                          <span className="min-w-0 truncate text-sm">{label}</span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
