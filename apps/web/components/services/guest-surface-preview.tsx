'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

import { Button } from '@workspace/ui/components/button'

type Props = {
  livePath: string | null
  /** Bump to force the iframe to reload after mutations. */
  previewKey?: string | number
  title: string
  openLabel: string
  /** Shown when `livePath` is null. */
  placeholder: ReactNode
}

export function GuestSurfacePreview({
  livePath,
  previewKey = 0,
  title,
  openLabel,
  placeholder,
}: Props) {
  return (
    <aside className="border-border flex h-[calc(100svh-6rem)] w-full max-w-xl flex-col gap-3 rounded-lg border p-4 lg:sticky lg:top-4 lg:h-[calc(100svh-5.5rem)] lg:w-[min(42vw,36rem)] lg:max-w-none lg:shrink-0">
      <h2 className="shrink-0 text-base font-semibold">{title}</h2>
      <div className="bg-muted border-border flex min-h-0 w-full flex-1 items-stretch justify-center overflow-hidden rounded-2xl border">
        {livePath ? (
          <iframe
            key={previewKey}
            title={title}
            src={livePath}
            className="bg-background h-full w-full"
          />
        ) : (
          <div className="text-muted-foreground flex items-center justify-center px-4 text-center text-xs">
            {placeholder}
          </div>
        )}
      </div>
      {livePath ? (
        <Button asChild variant="secondary" className="w-full shrink-0">
          <Link href={livePath} target="_blank" rel="noreferrer">
            {openLabel}
          </Link>
        </Button>
      ) : null}
    </aside>
  )
}
