'use client'

import { useEffect } from 'react'
import { Button } from '@workspace/ui/components/button'

export type ErrorFallbackProps = {
  title: string
  description: string
  tryAgainLabel: string
  digest?: string
  digestLabel?: string
  error: Error & { digest?: string }
  reset: () => void
  className?: string
}

export function ErrorFallback({
  title,
  description,
  tryAgainLabel,
  digest,
  digestLabel,
  error,
  reset,
  className = 'flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8',
}: ErrorFallbackProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const resolvedDigest = digest ?? error.digest

  return (
    <div aria-live="assertive" className={className} role="alert">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-center text-muted-foreground text-sm">{description}</p>
      {resolvedDigest && digestLabel ? (
        <p className="text-center text-muted-foreground text-xs">
          {digestLabel.replace('{digest}', resolvedDigest)}
        </p>
      ) : null}
      <Button onClick={() => reset()} type="button">
        {tryAgainLabel}
      </Button>
    </div>
  )
}
