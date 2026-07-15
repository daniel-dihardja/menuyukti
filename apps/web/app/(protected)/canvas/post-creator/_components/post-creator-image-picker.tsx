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
import { ImageIcon, Loader2, Upload } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import { loadMedia, uploadMedia, type MediaCatalogItem } from '@/lib/media/client-api'

import { MAX_ATTACHED_REFERENCE_PHOTOS } from './post-creator-constants'
import type { PostCreatorReferenceImage } from './post-creator-thumbnails-pane'

const MENTION_AT_END = /(?:^|\s)@([^\s@]*)$/

function parseMentionAtEnd(value: string): { filterQuery: string; mentionStart: number } | null {
  const match = MENTION_AT_END.exec(value)
  if (!match) return null
  const mentionStart = match.index! + (match[0].startsWith(' ') ? 1 : 0)
  return { filterQuery: match[1]!.toLowerCase(), mentionStart }
}

function stripTrailingMention(value: string): string {
  const parsed = parseMentionAtEnd(value)
  if (!parsed) return value
  return value.slice(0, parsed.mentionStart).trimEnd()
}

export type PostCreatorImagePickerProps = {
  value: string
  onValueChange: (next: string) => void
  onAddReference: (photo: PostCreatorReferenceImage) => void
  selectedNames: ReadonlySet<string>
  disabled?: boolean
  pickerAriaLabel: string
  emptyLabel: string
  uploadLabel: string
  uploadingLabel: string
  maxReachedLabel: string
  onUploadError?: (message: string) => void
  children: ReactNode
}

export function PostCreatorImagePicker({
  value,
  onValueChange,
  onAddReference,
  selectedNames,
  disabled = false,
  pickerAriaLabel,
  emptyLabel,
  uploadLabel,
  uploadingLabel,
  maxReachedLabel,
  onUploadError,
  children,
}: PostCreatorImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mediaItems, setMediaItems] = useState<MediaCatalogItem[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const mention = parseMentionAtEnd(value)
  const atMaxReferences = selectedNames.size >= MAX_ATTACHED_REFERENCE_PHOTOS

  const filteredMedia = useMemo(() => {
    if (!mention) return []
    const query = mention.filterQuery
    return mediaItems.filter(
      (p) =>
        !selectedNames.has(p.name) && (query.length === 0 || p.name.toLowerCase().includes(query)),
    )
  }, [mention, mediaItems, selectedNames])

  const menuOpen = mention !== null && !disabled

  const selectableCount = filteredMedia.length + (atMaxReferences ? 0 : 1)
  const showUploadRow = !atMaxReferences

  useEffect(() => {
    if (!menuOpen) {
      setActiveIndex(0)
      return
    }

    let cancelled = false

    async function fetchMedia() {
      setLoadingMedia(true)
      try {
        const list = await loadMedia()
        if (!cancelled) setMediaItems(list)
      } catch {
        if (!cancelled) setMediaItems([])
      } finally {
        if (!cancelled) setLoadingMedia(false)
      }
    }

    void fetchMedia()

    return () => {
      cancelled = true
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    setActiveIndex((prev) => Math.min(prev, Math.max(0, selectableCount - 1)))
  }, [menuOpen, selectableCount])

  const handleSelectMedia = useCallback(
    (item: MediaCatalogItem) => {
      if (selectedNames.has(item.name) || atMaxReferences) return
      onAddReference({ name: item.name, url: item.url, enabled: true })
      onValueChange(stripTrailingMention(value))
    },
    [atMaxReferences, onAddReference, onValueChange, selectedNames, value],
  )

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (list.length === 0 || atMaxReferences) return

      setUploading(true)
      try {
        const file = list[0]!
        const uploaded = await uploadMedia(file)
        setMediaItems((prev) => [uploaded, ...prev.filter((p) => p.name !== uploaded.name)])
        handleSelectMedia(uploaded)
      } catch (err) {
        onUploadError?.(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [atMaxReferences, handleSelectMedia, onUploadError],
  )

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files?.length) void handleUpload(files)
      e.target.value = ''
    },
    [handleUpload],
  )

  const handleKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.nativeEvent.isComposing || !menuOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onValueChange(stripTrailingMention(value))
        return
      }

      if (selectableCount === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % selectableCount)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + selectableCount) % selectableCount)
        return
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (showUploadRow && activeIndex === 0) {
          fileInputRef.current?.click()
          return
        }
        const mediaIndex = showUploadRow ? activeIndex - 1 : activeIndex
        const item = filteredMedia[mediaIndex]
        if (item) handleSelectMedia(item)
      }
    },
    [
      activeIndex,
      filteredMedia,
      handleSelectMedia,
      menuOpen,
      onValueChange,
      selectableCount,
      showUploadRow,
      value,
    ],
  )

  return (
    <Popover open={menuOpen}>
      <PopoverAnchor asChild>
        <div className="relative min-w-0 w-full" onKeyDownCapture={handleKeyDownCapture}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label={uploadLabel}
            className="sr-only"
            onChange={handleFileInputChange}
          />
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
          <PopoverTitle>{pickerAriaLabel}</PopoverTitle>
        </PopoverHeader>
        <Command shouldFilter={false}>
          <CommandList>
            {loadingMedia ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden />
              </div>
            ) : atMaxReferences ? (
              <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                {maxReachedLabel}
              </CommandEmpty>
            ) : (
              <>
                {showUploadRow ? (
                  <CommandGroup aria-label={pickerAriaLabel}>
                    <CommandItem
                      className={cn(
                        'flex w-full items-center gap-2',
                        activeIndex === 0 && 'bg-accent text-accent-foreground',
                      )}
                      disabled={uploading}
                      onSelect={() => fileInputRef.current?.click()}
                      value="__upload__"
                    >
                      {uploading ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                      ) : (
                        <Upload className="size-4 shrink-0" aria-hidden />
                      )}
                      <span>{uploading ? uploadingLabel : uploadLabel}</span>
                    </CommandItem>
                  </CommandGroup>
                ) : null}
                {filteredMedia.length > 0 ? (
                  <CommandGroup aria-label={pickerAriaLabel}>
                    {filteredMedia.map((item, i) => {
                      const rowIndex = showUploadRow ? i + 1 : i
                      return (
                        <CommandItem
                          key={item.name}
                          className={cn(
                            'flex w-full items-center gap-2',
                            rowIndex === activeIndex && 'bg-accent text-accent-foreground',
                          )}
                          onSelect={() => handleSelectMedia(item)}
                          value={item.name}
                        >
                          {item.url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs
                            <img
                              src={item.url}
                              alt=""
                              className="size-8 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <ImageIcon
                              className="size-8 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                          )}
                          <span className="truncate text-sm">{item.name}</span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                ) : (
                  !showUploadRow && (
                    <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                      {emptyLabel}
                    </CommandEmpty>
                  )
                )}
                {showUploadRow && filteredMedia.length === 0 && !loadingMedia ? (
                  <CommandEmpty className="px-3 py-6 text-center text-muted-foreground text-sm">
                    {emptyLabel}
                  </CommandEmpty>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
