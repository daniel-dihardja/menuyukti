'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@workspace/ui/components/dialog'
import { cn } from '@workspace/ui/lib/utils'

import { contentMediaType, type ContentCatalogItem } from './content-catalog-types'

export type ContentMediaPreviewDialogProps = {
  item: ContentCatalogItem | null
  onClose: () => void
  closeLabel: string
}

export function ContentMediaPreviewDialog({
  item,
  onClose,
  closeLabel,
}: ContentMediaPreviewDialogProps) {
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const [previewMediaLoaded, setPreviewMediaLoaded] = useState(false)

  useEffect(() => {
    setPreviewMediaLoaded(false)
  }, [item?.name])

  const handleClose = () => {
    previewVideoRef.current?.pause()
    onClose()
  }

  const isVideo = item != null && contentMediaType(item) === 'video'

  return (
    <Dialog
      open={item != null}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      {item ? (
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(96vw,72rem)] border-none bg-transparent p-0 shadow-none sm:max-w-[min(96vw,72rem)]"
        >
          <DialogTitle className="sr-only">{item.name}</DialogTitle>
          <div className="relative flex min-h-[12rem] items-center justify-center">
            <DialogClose
              type="button"
              aria-label={closeLabel}
              className="absolute top-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white shadow-lg ring-offset-background transition-opacity hover:bg-black/85 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
              onClick={() => handleClose()}
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogClose>
            {!previewMediaLoaded ? (
              <div className="absolute inset-0 z-0 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : null}
            {isVideo ? (
              <video
                ref={previewVideoRef}
                src={item.url}
                controls
                autoPlay
                playsInline
                className={cn(
                  'relative z-10 w-auto max-w-full object-contain shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] transition-opacity duration-300',
                  'max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(90vh-5.5rem)]',
                  previewMediaLoaded ? 'opacity-100' : 'opacity-0',
                )}
                onLoadedData={() => setPreviewMediaLoaded(true)}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element -- dynamic user uploads; dimensions vary */
              <img
                src={item.url}
                alt=""
                width={1200}
                height={900}
                className={cn(
                  'relative z-10 w-auto max-w-full object-contain shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] transition-opacity duration-300',
                  'max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(90vh-5.5rem)]',
                  previewMediaLoaded ? 'opacity-100' : 'opacity-0',
                )}
                onLoad={() => setPreviewMediaLoaded(true)}
              />
            )}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
