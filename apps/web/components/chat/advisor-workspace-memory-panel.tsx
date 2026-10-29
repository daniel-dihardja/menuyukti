'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

type AdvisorMemoryPayload = {
  locationId: number
  content: string
  updatedAt: string | null
}

type Props = {
  locationId: number
}

export function AdvisorWorkspaceMemoryPanel({ locationId }: Props) {
  const t = useTranslations('chat.workspace.advisorMemory')
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memory, setMemory] = useState<AdvisorMemoryPayload | null>(null)
  const [clearOpen, setClearOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}/advisor-memory`)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? t('loadError'))
      }
      const data = (await res.json()) as { advisorMemory: AdvisorMemoryPayload }
      setMemory(data.advisorMemory)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'))
      setMemory(null)
    } finally {
      setLoading(false)
    }
  }, [locationId, t])

  useEffect(() => {
    void load()
  }, [load])

  const clearMemory = useCallback(async () => {
    setClearing(true)
    setError(null)
    try {
      const res = await fetch(`/api/locations/${locationId}/advisor-memory`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? t('clearError'))
      }
      const data = (await res.json()) as { advisorMemory: AdvisorMemoryPayload }
      setMemory(data.advisorMemory)
      setClearOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('clearError'))
    } finally {
      setClearing(false)
    }
  }, [locationId, t])

  if (loading) {
    return (
      <section aria-busy="true" className="flex flex-col gap-2 border-b border-border pb-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-16 w-full" />
      </section>
    )
  }

  const content = memory?.content?.trim() ?? ''
  const hasMemory = content.length > 0

  return (
    <section
      aria-labelledby="advisor-memory-heading"
      className="flex flex-col gap-2 border-b border-border pb-3"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium" id="advisor-memory-heading">
          {t('title')}
        </h3>
        <p className="text-muted-foreground text-xs">{t('description')}</p>
      </div>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      {hasMemory ? (
        <pre className="bg-muted/40 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md px-2.5 py-2 font-sans text-xs leading-relaxed text-foreground">
          {content}
        </pre>
      ) : (
        <p className="text-muted-foreground text-xs">{t('empty')}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!hasMemory || clearing}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => setClearOpen(true)}
        >
          {t('clearButton')}
        </Button>
        {error ? (
          <Button size="sm" type="button" variant="ghost" onClick={() => void load()}>
            {t('retry')}
          </Button>
        ) : null}
      </div>

      <AlertDialog onOpenChange={setClearOpen} open={clearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clearConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing} type="button">
              {t('clearConfirmCancel')}
            </AlertDialogCancel>
            <Button
              disabled={clearing}
              type="button"
              variant="destructive"
              onClick={() => void clearMemory()}
            >
              {clearing ? t('clearing') : t('clearConfirmAction')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
