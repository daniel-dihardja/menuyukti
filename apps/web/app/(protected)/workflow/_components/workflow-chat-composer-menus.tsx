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
import { ChevronLeft, Folder, Loader2 } from 'lucide-react'
import { useWorkflowChatMentionItems } from './workflow-chat-mention-context'
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
import { formatMediaMentionLabel } from '@/lib/chat/workflow-chat-media-mention'
import {
  listMediaCollections,
  loadMedia,
  type MediaCatalogItem,
  type MediaCollection,
} from '@/lib/media/client-api'
import type { WorkflowVisualizationId } from '@/lib/workflow/workflow-visualization-ids'

export type SlashCommandDefinition = {
  id: string
  label: string
  description: string
}

export type MilestoneMentionItem = {
  id: string
  title: string
}

type MentionMenuEntry =
  | { kind: 'back' }
  | { kind: 'collection'; collection: MediaCollection }
  | { kind: 'milestone'; id: string; title: string }
  | { kind: 'visualization'; id: WorkflowVisualizationId; title: string }
  | { kind: 'media'; item: MediaCatalogItem }

export type WorkflowChatComposerMenusProps = {
  value: string
  onValueChange: (next: string) => void
  commands: SlashCommandDefinition[]
  onSelectSlashCommand: (command: string) => void
  slashAriaLabel: string
  onSelectMention: (milestoneId: string) => void
  onSelectVisualizationMention: (visualizationId: WorkflowVisualizationId, title: string) => void
  onSelectMediaMention: (item: MediaCatalogItem) => void
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
  onSelectVisualizationMention,
  onSelectMediaMention,
  mentionAriaLabel,
  mentionEmptyLabel,
  children,
}: WorkflowChatComposerMenusProps) {
  const tMention = useTranslations('analytics.workflows.chat.mentionMenu')
  const { milestones, visualizations, selectedMilestoneId, mentionMenusDisabled } =
    useWorkflowChatMentionItems()

  const [mediaItems, setMediaItems] = useState<MediaCatalogItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaLoadAttempted, setMediaLoadAttempted] = useState(false)
  const [collections, setCollections] = useState<MediaCollection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [browseCollectionId, setBrowseCollectionId] = useState<number | null>(null)

  const browsingCollection = useMemo(
    () =>
      browseCollectionId !== null
        ? (collections.find((c) => c.id === browseCollectionId) ?? null)
        : null,
    [browseCollectionId, collections],
  )

  const otherMilestones = useMemo(
    () =>
      milestones
        .filter((m) => (selectedMilestoneId === null ? true : m.id !== selectedMilestoneId))
        .map((m) => ({
          id: m.id,
          title: m.title?.trim() ?? m.id,
        })),
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
  const mentionMenuOpenBase = value.startsWith('@') && !mentionMenusDisabled
  const isBrowsingCollection = browseCollectionId !== null

  useEffect(() => {
    if (!mentionMenuOpenBase) {
      setBrowseCollectionId(null)
      return
    }
    let cancelled = false
    setCollectionsLoading(true)
    void listMediaCollections()
      .then((cols) => {
        if (!cancelled) {
          setCollections(cols)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollections([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCollectionsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [mentionMenuOpenBase])

  useEffect(() => {
    if (!mentionMenuOpenBase) {
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
        if (!cancelled) {
          setMediaLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [browseCollectionId, mentionMenuOpenBase])

  const filteredMilestones = useMemo(() => {
    if (!value.startsWith('@') || isBrowsingCollection) {
      return []
    }
    return otherMilestones.filter((m) => m.title.toLowerCase().includes(mentionFilterQuery))
  }, [isBrowsingCollection, mentionFilterQuery, otherMilestones, value])

  const filteredVisualizations = useMemo(() => {
    if (!value.startsWith('@') || isBrowsingCollection) {
      return []
    }
    return visualizations.filter((v) => v.title.toLowerCase().includes(mentionFilterQuery))
  }, [isBrowsingCollection, mentionFilterQuery, value, visualizations])

  const filteredCollections = useMemo(() => {
    if (!value.startsWith('@') || isBrowsingCollection) {
      return []
    }
    return filterCollectionsForMention(collections, mentionFilterQuery)
  }, [collections, isBrowsingCollection, mentionFilterQuery, value])

  const filteredMedia = useMemo(() => {
    if (!value.startsWith('@')) {
      return []
    }
    return filterMediaForCollectionBrowse(mediaItems, mentionFilterQuery)
  }, [mentionFilterQuery, mediaItems, value])

  const flatMentionEntries = useMemo((): MentionMenuEntry[] => {
    if (isBrowsingCollection) {
      const entries: MentionMenuEntry[] = [{ kind: 'back' }]
      for (const item of filteredMedia) {
        entries.push({ kind: 'media', item })
      }
      return entries
    }
    const milestoneEntries: MentionMenuEntry[] = filteredMilestones.map((m) => ({
      kind: 'milestone',
      id: m.id,
      title: m.title,
    }))
    const visualizationEntries: MentionMenuEntry[] = filteredVisualizations.map((v) => ({
      kind: 'visualization',
      id: v.id as WorkflowVisualizationId,
      title: v.title,
    }))
    const collectionEntries: MentionMenuEntry[] = filteredCollections.map((collection) => ({
      kind: 'collection',
      collection,
    }))
    const mediaEntries: MentionMenuEntry[] = filteredMedia.map((item) => ({
      kind: 'media',
      item,
    }))
    return [...milestoneEntries, ...visualizationEntries, ...collectionEntries, ...mediaEntries]
  }, [
    filteredCollections,
    filteredMedia,
    filteredMilestones,
    filteredVisualizations,
    isBrowsingCollection,
  ])

  const slashMenuOpen = value.startsWith('/') && filteredSlash.length > 0
  const hasMentionCandidates =
    otherMilestones.length > 0 ||
    visualizations.length > 0 ||
    mediaItems.length > 0 ||
    collections.length > 0 ||
    mediaLoading ||
    collectionsLoading ||
    !mediaLoadAttempted ||
    isBrowsingCollection
  /** Hide popover once the typed tail is not a mention prefix (e.g. `@Brief what is…`) so CommandEmpty does not flash. */
  const mentionMenuOpen =
    mentionMenuOpenBase &&
    hasMentionCandidates &&
    (flatMentionEntries.length > 0 ||
      mentionFilterQuery.length === 0 ||
      mediaLoading ||
      collectionsLoading ||
      isBrowsingCollection)

  const menuOpen = slashMenuOpen || mentionMenuOpen
  const panelAriaLabel = slashMenuOpen
    ? slashAriaLabel
    : isBrowsingCollection
      ? (browsingCollection?.name ?? mentionAriaLabel)
      : mentionAriaLabel

  const [slashActiveIndex, setSlashActiveIndex] = useState(0)
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0)
  const commandListRef = useRef<HTMLDivElement>(null)

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
    if (flatMentionEntries.length === 0) {
      setMentionActiveIndex(0)
      return
    }
    setMentionActiveIndex((prev) => Math.min(prev, flatMentionEntries.length - 1))
  }, [flatMentionEntries.length, mentionMenuOpen])

  useEffect(() => {
    setMentionActiveIndex(0)
  }, [browseCollectionId])

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const list = commandListRef.current
    if (!list) {
      return
    }
    const active = list.querySelector<HTMLElement>('[data-workflow-chat-menu-active="true"]')
    if (!active) {
      return
    }
    const listRect = list.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    if (activeRect.bottom > listRect.bottom) {
      list.scrollTop += activeRect.bottom - listRect.bottom
    } else if (activeRect.top < listRect.top) {
      list.scrollTop -= listRect.top - activeRect.top
    }
  }, [menuOpen, mentionActiveIndex, slashActiveIndex, slashMenuOpen, mentionMenuOpen])

  const exitCollectionBrowse = useCallback(() => {
    setBrowseCollectionId(null)
  }, [])

  const selectMentionEntry = useCallback(
    (entry: MentionMenuEntry) => {
      if (entry.kind === 'back') {
        exitCollectionBrowse()
        return
      }
      if (entry.kind === 'collection') {
        setBrowseCollectionId(entry.collection.id)
        return
      }
      if (entry.kind === 'milestone') {
        onSelectMention(entry.id)
        return
      }
      if (entry.kind === 'visualization') {
        onSelectVisualizationMention(entry.id, entry.title)
        return
      }
      onSelectMediaMention(entry.item)
    },
    [exitCollectionBrowse, onSelectMention, onSelectVisualizationMention, onSelectMediaMention],
  )

  const handleKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }

      if (mentionMenuOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          if (isBrowsingCollection) {
            exitCollectionBrowse()
            return
          }
          onValueChange('')
          return
        }
        if (flatMentionEntries.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setMentionActiveIndex((i) => (i + 1) % flatMentionEntries.length)
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setMentionActiveIndex(
              (i) => (i - 1 + flatMentionEntries.length) % flatMentionEntries.length,
            )
            return
          }
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const entry = flatMentionEntries[mentionActiveIndex]
            if (entry) {
              selectMentionEntry(entry)
            }
            return
          }
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
      exitCollectionBrowse,
      flatMentionEntries,
      filteredSlash,
      isBrowsingCollection,
      mentionActiveIndex,
      mentionMenuOpen,
      onSelectSlashCommand,
      onValueChange,
      selectMentionEntry,
      slashActiveIndex,
      slashMenuOpen,
    ],
  )

  let flatIndex = -1

  const mediaHeading = isBrowsingCollection
    ? (browsingCollection?.name ?? tMention('mediaGroup'))
    : tMention('mediaGroup')

  const showCollectionMediaLoading =
    isBrowsingCollection && mediaLoading && filteredMedia.length === 0
  const showRootMediaLoading =
    !isBrowsingCollection &&
    mediaLoading &&
    filteredMedia.length === 0 &&
    filteredCollections.length === 0

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
          <CommandList ref={commandListRef}>
            {slashMenuOpen ? (
              <CommandGroup aria-label={slashAriaLabel}>
                {filteredSlash.map((cmd, i) => (
                  <CommandItem
                    key={cmd.id}
                    className={cn(
                      'flex w-full flex-col items-start gap-1',
                      i === slashActiveIndex && 'bg-accent text-accent-foreground',
                    )}
                    data-workflow-chat-menu-active={i === slashActiveIndex ? 'true' : undefined}
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
                {flatMentionEntries.length > 0 ||
                mediaLoading ||
                collectionsLoading ||
                isBrowsingCollection ? (
                  <>
                    {isBrowsingCollection ? (
                      <>
                        {(() => {
                          flatIndex += 1
                          const activeIndex = flatIndex
                          return (
                            <CommandGroup>
                              <CommandItem
                                className={cn(
                                  'w-full items-center gap-2',
                                  activeIndex === mentionActiveIndex &&
                                    'bg-accent text-accent-foreground',
                                )}
                                data-workflow-chat-menu-active={
                                  activeIndex === mentionActiveIndex ? 'true' : undefined
                                }
                                onSelect={() => selectMentionEntry({ kind: 'back' })}
                                value="__back__"
                              >
                                <ChevronLeft className="size-4 shrink-0" aria-hidden />
                                <span className="font-medium">{tMention('backToMedia')}</span>
                              </CommandItem>
                            </CommandGroup>
                          )
                        })()}
                        {showCollectionMediaLoading ? (
                          <CommandGroup heading={mediaHeading}>
                            <div className="flex items-center gap-2 px-2 py-3 text-muted-foreground text-sm">
                              <Loader2 className="size-4 animate-spin" />
                              {tMention('collectionLoading')}
                            </div>
                          </CommandGroup>
                        ) : null}
                        {!showCollectionMediaLoading && filteredMedia.length === 0 ? (
                          <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                            {tMention('collectionEmpty')}
                          </div>
                        ) : null}
                        {filteredMedia.length > 0 ? (
                          <CommandGroup
                            heading={mediaHeading}
                            aria-label={tMention('mediaAriaLabel')}
                          >
                            {filteredMedia.map((item) => {
                              flatIndex += 1
                              const activeIndex = flatIndex
                              const label =
                                item.displayName?.trim() || formatMediaMentionLabel(item.name)
                              return (
                                <CommandItem
                                  key={`media-${item.name}`}
                                  className={cn(
                                    'w-full items-center gap-2',
                                    activeIndex === mentionActiveIndex &&
                                      'bg-accent text-accent-foreground',
                                  )}
                                  data-workflow-chat-menu-active={
                                    activeIndex === mentionActiveIndex ? 'true' : undefined
                                  }
                                  onSelect={() => onSelectMediaMention(item)}
                                  value={item.name}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- mention preview */}
                                  <img
                                    alt=""
                                    className="size-16 shrink-0 rounded object-cover"
                                    height={64}
                                    src={item.url}
                                    width={64}
                                  />
                                  <span className="min-w-0 truncate font-medium">{label}</span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {filteredMilestones.length > 0 ? (
                          <CommandGroup
                            heading={tMention('milestonesGroup')}
                            aria-label={mentionAriaLabel}
                          >
                            {filteredMilestones.map((m) => {
                              flatIndex += 1
                              const activeIndex = flatIndex
                              return (
                                <CommandItem
                                  key={`milestone-${m.id}`}
                                  className={cn(
                                    'w-full items-start',
                                    activeIndex === mentionActiveIndex &&
                                      'bg-accent text-accent-foreground',
                                  )}
                                  data-workflow-chat-menu-active={
                                    activeIndex === mentionActiveIndex ? 'true' : undefined
                                  }
                                  onSelect={() => onSelectMention(m.id)}
                                  value={m.title}
                                >
                                  <span className="font-medium">{m.title}</span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        ) : null}
                        {filteredVisualizations.length > 0 ? (
                          <CommandGroup
                            heading={tMention('visualizationsGroup')}
                            aria-label={tMention('visualizationsAriaLabel')}
                          >
                            {filteredVisualizations.map((v) => {
                              flatIndex += 1
                              const activeIndex = flatIndex
                              return (
                                <CommandItem
                                  key={`viz-${v.id}`}
                                  className={cn(
                                    'w-full items-start',
                                    activeIndex === mentionActiveIndex &&
                                      'bg-accent text-accent-foreground',
                                  )}
                                  data-workflow-chat-menu-active={
                                    activeIndex === mentionActiveIndex ? 'true' : undefined
                                  }
                                  onSelect={() =>
                                    onSelectVisualizationMention(
                                      v.id as WorkflowVisualizationId,
                                      v.title,
                                    )
                                  }
                                  value={v.title}
                                >
                                  <span className="font-medium">{v.title}</span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        ) : null}
                        {filteredCollections.length > 0 ? (
                          <CommandGroup
                            heading={tMention('collectionsGroup')}
                            aria-label={tMention('collectionsAriaLabel')}
                          >
                            {filteredCollections.map((collection) => {
                              flatIndex += 1
                              const activeIndex = flatIndex
                              return (
                                <CommandItem
                                  key={`collection-${collection.id}`}
                                  className={cn(
                                    'w-full items-center gap-2',
                                    activeIndex === mentionActiveIndex &&
                                      'bg-accent text-accent-foreground',
                                  )}
                                  data-workflow-chat-menu-active={
                                    activeIndex === mentionActiveIndex ? 'true' : undefined
                                  }
                                  onSelect={() =>
                                    selectMentionEntry({ kind: 'collection', collection })
                                  }
                                  value={`collection-${collection.name}`}
                                >
                                  <Folder
                                    className="size-4 shrink-0 text-muted-foreground"
                                    aria-hidden
                                  />
                                  <span className="min-w-0 flex-1 truncate font-medium">
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
                        {showRootMediaLoading || collectionsLoading ? (
                          <CommandGroup heading={tMention('mediaGroup')}>
                            <div className="flex items-center gap-2 px-2 py-3 text-muted-foreground text-sm">
                              <Loader2 className="size-4 animate-spin" />
                              {tMention('mediaLoading')}
                            </div>
                          </CommandGroup>
                        ) : null}
                        {filteredMedia.length > 0 ? (
                          <CommandGroup
                            heading={tMention('mediaGroup')}
                            aria-label={tMention('mediaAriaLabel')}
                          >
                            {filteredMedia.map((item) => {
                              flatIndex += 1
                              const activeIndex = flatIndex
                              const label =
                                item.displayName?.trim() || formatMediaMentionLabel(item.name)
                              return (
                                <CommandItem
                                  key={`media-${item.name}`}
                                  className={cn(
                                    'w-full items-center gap-2',
                                    activeIndex === mentionActiveIndex &&
                                      'bg-accent text-accent-foreground',
                                  )}
                                  data-workflow-chat-menu-active={
                                    activeIndex === mentionActiveIndex ? 'true' : undefined
                                  }
                                  onSelect={() => onSelectMediaMention(item)}
                                  value={item.name}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- mention preview */}
                                  <img
                                    alt=""
                                    className="size-16 shrink-0 rounded object-cover"
                                    height={64}
                                    src={item.url}
                                    width={64}
                                  />
                                  <span className="min-w-0 truncate font-medium">{label}</span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        ) : null}
                      </>
                    )}
                  </>
                ) : (
                  <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                    {mediaLoadAttempted &&
                    mediaItems.length === 0 &&
                    collections.length === 0 &&
                    otherMilestones.length === 0
                      ? tMention('mediaEmpty')
                      : visualizations.length === 0 && otherMilestones.length > 0
                        ? tMention('noAttachedCharts')
                        : mentionEmptyLabel}
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
