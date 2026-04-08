'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'

import type { ImageAiFlowRow } from '@/lib/graphql/queries'
import { Button } from '@workspace/ui/components/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { cn } from '@workspace/ui/lib/utils'

import { ImageFlowCard } from './image-flow-card'
import { ImageFlowDialog } from './image-flow-dialog'
import type { ImageFlowFormValues } from './image-flow-form'

type Props = {
  initialFlows: ImageAiFlowRow[]
}

function sortFlows(rows: ImageAiFlowRow[]): ImageAiFlowRow[] {
  return [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.id - b.id
  })
}

export function ImageFlowsManager({ initialFlows }: Props) {
  const t = useTranslations('imageFlows')
  const [flows, setFlows] = useState<ImageAiFlowRow[]>(() => sortFlows(initialFlows))
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<ImageAiFlowRow | null>(null)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 4000)
  }, [])

  const handleCreate = () => {
    setEditing(null)
    setDialogMode('create')
  }

  const handleEdit = (flow: ImageAiFlowRow) => {
    setEditing(flow)
    setDialogMode('edit')
  }

  const buildCreateBody = (v: ImageFlowFormValues, styleIds: string[] | null) => ({
    slug: v.slug.trim(),
    displayName: v.displayName.trim(),
    prompt: v.prompt.trim(),
    model: v.model.trim(),
    promptEnhance: v.promptEnhance.trim() ? v.promptEnhance.trim() : null,
    imageReferenceStrength: v.imageReferenceStrength.trim()
      ? v.imageReferenceStrength.trim()
      : null,
    styleIds,
    isActive: v.isActive,
    sortOrder: v.sortOrder,
  })

  const submitCreate = async (v: ImageFlowFormValues, styleIds: string[] | null) => {
    const res = await fetch('/api/image-ai-flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCreateBody(v, styleIds)),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      showToast('error', body?.message ?? t('toastError'))
      throw new Error('create')
    }
    const data = (await res.json()) as { flow: ImageAiFlowRow }
    setFlows((prev) => sortFlows([...prev, data.flow]))
    showToast('success', t('toastCreated'))
  }

  const submitUpdate = async (v: ImageFlowFormValues, styleIds: string[] | null) => {
    if (!editing) return
    const originalSlug = editing.slug
    const body: Record<string, unknown> = {
      displayName: v.displayName.trim(),
      prompt: v.prompt.trim(),
      model: v.model.trim(),
      promptEnhance: v.promptEnhance.trim() ? v.promptEnhance.trim() : null,
      imageReferenceStrength: v.imageReferenceStrength.trim()
        ? v.imageReferenceStrength.trim()
        : null,
      styleIds,
      isActive: v.isActive,
      sortOrder: v.sortOrder,
    }
    const newSlug = v.slug.trim()
    if (newSlug !== originalSlug) {
      body.newSlug = newSlug
    }

    const res = await fetch(`/api/image-ai-flows/${encodeURIComponent(originalSlug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as { message?: string } | null
      showToast('error', errBody?.message ?? t('toastError'))
      throw new Error('update')
    }
    const data = (await res.json()) as { flow: ImageAiFlowRow }
    setFlows((prev) => {
      const next = prev.map((f) => (f.slug === originalSlug ? data.flow : f))
      return sortFlows(next)
    })
    showToast('success', t('toastUpdated'))
  }

  const handleDialogSubmit = async (v: ImageFlowFormValues, styleIds: string[] | null) => {
    if (dialogMode === 'create') {
      await submitCreate(v, styleIds)
    } else {
      await submitUpdate(v, styleIds)
    }
  }

  const handleDelete = async (flow: ImageAiFlowRow) => {
    const res = await fetch(`/api/image-ai-flows/${encodeURIComponent(flow.slug)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as { message?: string } | null
      showToast('error', errBody?.message ?? t('toastError'))
      throw new Error('delete')
    }
    setFlows((prev) => prev.filter((f) => f.id !== flow.id))
    showToast('success', t('toastDeleted'))
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300',
            toast.kind === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/90 text-emerald-50'
              : 'border-red-500/30 bg-red-950/90 text-red-50',
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-pretty">{t('sectionTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {t('sectionDescription')}
          </p>
        </div>
        <Button type="button" onClick={handleCreate} className="shrink-0">
          <Plus data-icon="inline-start" />
          {t('addFlow')}
        </Button>
      </div>

      {flows.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">{t('emptyTitle')}</CardTitle>
            <CardDescription>{t('emptyDescription')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {flows.map((f) => (
            <ImageFlowCard key={f.id} flow={f} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <ImageFlowDialog
        mode={dialogMode === 'edit' ? 'edit' : 'create'}
        open={dialogMode !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDialogMode(null)
            setEditing(null)
          }
        }}
        flow={editing}
        onSubmit={handleDialogSubmit}
      />
    </div>
  )
}
