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
import { ChevronLeft, Folder, ImageIcon, Loader2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'

import {
  filterCollectionsForMention,
  filterMediaForCollectionBrowse,
} from '@/lib/chat/media-mention-collection-browse'
import {
  clearTrailingMentionTrigger,
  matchesMentionFilter,
  parseMentionAtEnd,
} from '@/lib/chat/post-creator-chat-mention'
import { formatMediaMentionLabel } from '@/lib/chat/workflow-chat-media-mention'
import {
  listMediaCollections,
  loadMedia,
  type MediaCatalogItem,
  type MediaCollection,
} from '@/lib/media/client-api'

export type PostCreatorPreviewMentionCandidate = {
  kind: 'post' | 'photo'
  name: string
  url: string
  label: string
}

type MentionMenuEntry =
  | { kind: 'back' }
  | { kind: 'collection'; collection: MediaCollection }
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
  const tMention = useTranslations('postCreator.chat.mentionMenu')
  const mention = parseMentionAtEnd(value)
  const filterQuery = mention?.filterQuery ?? ''
  const menuOpen = mention !== null && !disabled

  const [mediaItems, setMediaItems] = useState<MediaCatalogItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaLoadAttempted, setMediaLoadAttempted] = useState(false)
  const [collections, setCollections] = useState<MediaCollection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [browseCollectionId, setBrowseCollectionId] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const commandListRef = useRef<HTMLDivElement>(null)

  const isBrowsingCollection = browseCollectionId !== null
  const browsingCollection = useMemo(
    () =>
      browseCollectionId !== null
        ? (collections.find((c) => c.id === browseCollectionId) ?? null)
        : null,
    [browseCollectionId, collections],
  )

  const candidateMatches =
    !isBrowsingCollection &&
    candidate != null &&
    matchesMentionFilter(filterQuery, candidate.name, candidate.label)

  const filteredCollections = useMemo(() => {
    if (isBrowsingCollection) return []
    return filterCollectionsForMention(collections, filterQuery)
  }, [collections, filterQuery, isBrowsingCollection])

  const filteredMedia = useMemo(
    () => filterMediaForCollectionBrowse(mediaItems, filterQuery, excludeNames),
    [excludeNames, filterQuery, mediaItems],
  )

  const flatEntries = useMemo((): MentionMenuEntry[] => {
    if (isBrowsingCollection) {
      const entries: MentionMenuEntry[] = [{ kind: 'back' }]
      for (const item of filteredMedia) {
        entries.push({ kind: 'media', item })
      }
      return entries
    }
    const entries: MentionMenuEntry[] = []
    if (candidateMatches && candidate) {
      entries.push({ kind: 'preview', candidate })
    }
    for (const collection of filteredCollections) {
      entries.push({ kind: 'collection', collection })
    }
    for (const item of filteredMedia) {
      entries.push({ kind: 'media', item })
    }
    return entries
  }, [candidate, candidateMatches, filteredCollections, filteredMedia, isBrowsingCollection])

  useEffect(() => {
    if (!menuOpen) {
      setBrowseCollectionId(null)
      setActiveIndex(0)
      return
    }
    let cancelled = false
    setCollectionsLoading(true)
    void listMediaCollections()
      .then((cols) => {
        if (!cancelled) setCollections(cols)
      })
      .catch(() => {
        if (!cancelled) setCollections([])
      })
      .finally(() => {
        if (!cancelled) setCollectionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    let cancelled = false
    setMediaLoading(true)
    const load =
      browseCollectionId === null ? loadMedia() : loadMedia({ collectionId: browseCollectionId })
    void load
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
  }, [browseCollectionId, menuOpen])

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
    setActiveIndex(0)
  }, [browseCollectionId])

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

  const exitCollectionBrowse = useCallback(() => {
    setBrowseCollectionId(null)
  }, [])

  const selectEntry = useCallback(
    (entry: MentionMenuEntry) => {
      if (entry.kind === 'back') {
        exitCollectionBrowse()
        return
      }
      if (entry.kind === 'collection') {
        setBrowseCollectionId(entry.collection.id)
        return
      }
      if (entry.kind === 'preview') {
        onSelectPreview(entry.candidate)
      } else {
        onSelectMedia(entry.item)
      }
      onValueChange(clearTrailingMentionTrigger(value))
    },
    [exitCollectionBrowse, onSelectMedia, onSelectPreview, onValueChange, value],
  )

  const handleKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.nativeEvent.isComposing || !menuOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        if (isBrowsingCollection) {
          exitCollectionBrowse()
          return
        }
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
    [
      activeIndex,
      exitCollectionBrowse,
      flatEntries,
      isBrowsingCollection,
      menuOpen,
      onValueChange,
      selectEntry,
      value,
    ],
  )

  const mediaHeading = isBrowsingCollection
    ? (browsingCollection?.name ?? mediaGroupLabel)
    : mediaGroupLabel

  const showMediaLoading =
    mediaLoading &&
    filteredMedia.length === 0 &&
    (isBrowsingCollection || filteredCollections.length === 0)
  const showEmpty =
    !showMediaLoading &&
    !collectionsLoading &&
    flatEntries.length === 0 &&
    (!mediaLoading || mediaLoadAttempted) &&
    !isBrowsingCollection

  const emptyLabel =
    mediaLoadAttempted && mediaItems.length === 0 && collections.length === 0 && !candidateMatches
      ? mediaEmptyLabel
      : mentionEmptyLabel

  let flatIndex = -1

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
          <PopoverTitle>
            {isBrowsingCollection
              ? (browsingCollection?.name ?? mentionAriaLabel)
              : mentionAriaLabel}
          </PopoverTitle>
        </PopoverHeader>
        <Command shouldFilter={false}>
          <CommandList ref={commandListRef}>
            {showEmpty ? (
              <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                {emptyLabel}
              </CommandEmpty>
            ) : (
              <>
                {isBrowsingCollection ? (
                  <>
                    {(() => {
                      flatIndex += 1
                      const idx = flatIndex
                      return (
                        <CommandGroup>
                          <CommandItem
                            className={cn(
                              'flex w-full items-center gap-2',
                              activeIndex === idx && 'bg-accent text-accent-foreground',
                            )}
                            data-post-creator-mention-active={
                              activeIndex === idx ? 'true' : undefined
                            }
                            onSelect={() => selectEntry({ kind: 'back' })}
                            value="__back__"
                          >
                            <ChevronLeft className="size-4 shrink-0" aria-hidden />
                            <span className="font-medium">{tMention('backToMedia')}</span>
                          </CommandItem>
                        </CommandGroup>
                      )
                    })()}
                    {showMediaLoading ? (
                      <CommandGroup heading={mediaHeading}>
                        <div className="flex items-center gap-2 px-2 py-3 text-muted-foreground text-sm">
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          {tMention('collectionLoading')}
                        </div>
                      </CommandGroup>
                    ) : null}
                    {!showMediaLoading && filteredMedia.length === 0 ? (
                      <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                        {tMention('collectionEmpty')}
                      </div>
                    ) : null}
                    {filteredMedia.length > 0 ? (
                      <CommandGroup heading={mediaHeading} aria-label={mediaAriaLabel}>
                        {filteredMedia.map((item) => {
                          flatIndex += 1
                          const idx = flatIndex
                          const label =
                            item.displayName?.trim() || formatMediaMentionLabel(item.name)
                          return (
                            <CommandItem
                              key={item.name}
                              className={cn(
                                'flex w-full items-center gap-2',
                                activeIndex === idx && 'bg-accent text-accent-foreground',
                              )}
                              data-post-creator-mention-active={
                                activeIndex === idx ? 'true' : undefined
                              }
                              onSelect={() => selectEntry({ kind: 'media', item })}
                              value={`media-${item.name}`}
                            >
                              {item.url ? (
                                // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                                <img
                                  alt=""
                                  className="size-16 shrink-0 rounded object-cover"
                                  height={64}
                                  src={item.url}
                                  width={64}
                                />
                              ) : (
                                <ImageIcon
                                  className="size-16 shrink-0 text-muted-foreground"
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
                ) : (
                  <>
                    {candidateMatches && candidate ? (
                      <CommandGroup heading={previewGroupLabel} aria-label={previewGroupLabel}>
                        {(() => {
                          flatIndex += 1
                          const idx = flatIndex
                          return (
                            <CommandItem
                              className={cn(
                                'flex w-full items-center gap-2',
                                activeIndex === idx && 'bg-accent text-accent-foreground',
                              )}
                              data-post-creator-mention-active={
                                activeIndex === idx ? 'true' : undefined
                              }
                              onSelect={() => selectEntry({ kind: 'preview', candidate })}
                              value={`preview-${candidate.name}`}
                            >
                              {candidate.url ? (
                                // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                                <img
                                  alt=""
                                  className="size-16 shrink-0 rounded object-cover"
                                  height={64}
                                  src={candidate.url}
                                  width={64}
                                />
                              ) : (
                                <ImageIcon
                                  className="size-16 shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                              )}
                              <span className="truncate text-sm">{candidate.label}</span>
                            </CommandItem>
                          )
                        })()}
                      </CommandGroup>
                    ) : null}
                    {filteredCollections.length > 0 ? (
                      <CommandGroup
                        heading={tMention('collectionsGroup')}
                        aria-label={tMention('collectionsAriaLabel')}
                      >
                        {filteredCollections.map((collection) => {
                          flatIndex += 1
                          const idx = flatIndex
                          return (
                            <CommandItem
                              key={`collection-${collection.id}`}
                              className={cn(
                                'flex w-full items-center gap-2',
                                activeIndex === idx && 'bg-accent text-accent-foreground',
                              )}
                              data-post-creator-mention-active={
                                activeIndex === idx ? 'true' : undefined
                              }
                              onSelect={() => selectEntry({ kind: 'collection', collection })}
                              value={`collection-${collection.name}`}
                            >
                              <Folder
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                {collection.name}
                              </span>
                              <span className="shrink-0 text-muted-foreground text-xs">
                                {tMention('collectionMemberCount', {
                                  count: collection.memberCount,
                                })}
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    ) : null}
                    {showMediaLoading || collectionsLoading ? (
                      <CommandGroup heading={mediaGroupLabel}>
                        <div className="flex items-center gap-2 px-2 py-3 text-muted-foreground text-sm">
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          {mediaLoadingLabel}
                        </div>
                      </CommandGroup>
                    ) : null}
                    {filteredMedia.length > 0 ? (
                      <CommandGroup heading={mediaGroupLabel} aria-label={mediaAriaLabel}>
                        {filteredMedia.map((item) => {
                          flatIndex += 1
                          const idx = flatIndex
                          const label =
                            item.displayName?.trim() || formatMediaMentionLabel(item.name)
                          return (
                            <CommandItem
                              key={item.name}
                              className={cn(
                                'flex w-full items-center gap-2',
                                activeIndex === idx && 'bg-accent text-accent-foreground',
                              )}
                              data-post-creator-mention-active={
                                activeIndex === idx ? 'true' : undefined
                              }
                              onSelect={() => selectEntry({ kind: 'media', item })}
                              value={`media-${item.name}`}
                            >
                              {item.url ? (
                                // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                                <img
                                  alt=""
                                  className="size-16 shrink-0 rounded object-cover"
                                  height={64}
                                  src={item.url}
                                  width={64}
                                />
                              ) : (
                                <ImageIcon
                                  className="size-16 shrink-0 text-muted-foreground"
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
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
