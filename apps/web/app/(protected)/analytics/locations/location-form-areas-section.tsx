'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { LocationArea } from '@/lib/graphql/queries/locations'
import { Button } from '@workspace/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { TabsContent } from '@workspace/ui/components/tabs'

type Props = {
  locationId: string
  initialAreas: LocationArea[]
}

export function LocationAreasSection({ locationId, initialAreas }: Props) {
  const t = useTranslations('analytics.branches.form')
  const router = useRouter()
  const [areas, setAreas] = useState(() =>
    [...initialAreas].sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id) - Number(b.id)),
  )
  const [newName, setNewName] = useState('')
  const [pending, setPending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const locationIdNum = Number(locationId)

  async function refreshFromServer(next: LocationArea[]) {
    setAreas([...next].sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id) - Number(b.id)))
    router.refresh()
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) {
      toast.error(t('areas.errors.nameRequired'))
      return
    }
    setPending(true)
    try {
      const res = await fetch('/api/location-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: locationIdNum, name }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? t('areas.errors.saveFailed'))
      }
      const created = (await res.json()) as LocationArea & { locationId?: string }
      setNewName('')
      toast.success(t('areas.toast.created'))
      await refreshFromServer([...areas, created])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('areas.errors.saveFailed'))
    } finally {
      setPending(false)
    }
  }

  async function handleRename(area: LocationArea) {
    const name = editingName.trim()
    if (!name) {
      toast.error(t('areas.errors.nameRequired'))
      return
    }
    if (name === area.name) {
      setEditingId(null)
      return
    }
    setPending(true)
    try {
      const res = await fetch(`/api/location-areas/${area.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? t('areas.errors.saveFailed'))
      }
      const updated = (await res.json()) as LocationArea
      setEditingId(null)
      toast.success(t('areas.toast.updated'))
      await refreshFromServer(areas.map((row) => (row.id === updated.id ? updated : row)))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('areas.errors.saveFailed'))
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(area: LocationArea) {
    if (!window.confirm(t('areas.deleteConfirm', { name: area.name }))) return
    setPending(true)
    try {
      const res = await fetch(`/api/location-areas/${area.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(data?.message ?? t('areas.errors.deleteFailed'))
      }
      toast.success(t('areas.toast.deleted'))
      await refreshFromServer(areas.filter((row) => row.id !== area.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('areas.errors.deleteFailed'))
    } finally {
      setPending(false)
    }
  }

  async function handleMove(area: LocationArea, direction: 'up' | 'down') {
    const index = areas.findIndex((row) => row.id === area.id)
    if (index < 0) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= areas.length) return
    const other = areas[swapIndex]
    if (!other) return

    setPending(true)
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/location-areas/${area.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: other.sortOrder }),
        }),
        fetch(`/api/location-areas/${other.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: area.sortOrder }),
        }),
      ])
      if (!resA.ok || !resB.ok) {
        throw new Error(t('areas.errors.saveFailed'))
      }
      const updatedA = (await resA.json()) as LocationArea
      const updatedB = (await resB.json()) as LocationArea
      await refreshFromServer(
        areas.map((row) => {
          if (row.id === updatedA.id) return updatedA
          if (row.id === updatedB.id) return updatedB
          return row
        }),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('areas.errors.saveFailed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <TabsContent value="areas" className="mt-0 flex flex-col gap-4">
      <FieldSet>
        <FieldLegend>{t('areas.title')}</FieldLegend>
        <FieldDescription>{t('areas.description')}</FieldDescription>
        <FieldGroup className="gap-4">
          {areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('areas.empty')}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {areas.map((area, index) => (
                <li
                  key={area.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  {editingId === area.id ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={editingName}
                        disabled={pending}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="min-h-11 touch-manipulation sm:max-w-xs lg:min-h-9"
                        aria-label={t('areas.nameLabel')}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending}
                          onClick={() => void handleRename(area)}
                        >
                          {pending ? <Spinner data-icon="inline-start" /> : null}
                          {t('areas.saveName')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => setEditingId(null)}
                        >
                          {t('areas.cancelEdit')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-sm font-medium hover:underline"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(area.id)
                        setEditingName(area.name)
                      }}
                    >
                      {area.name}
                    </button>
                  )}
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={pending || index === 0}
                      aria-label={t('areas.moveUpAria', { name: area.name })}
                      onClick={() => void handleMove(area, 'up')}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={pending || index === areas.length - 1}
                      aria-label={t('areas.moveDownAria', { name: area.name })}
                      onClick={() => void handleMove(area, 'down')}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={pending}
                      aria-label={t('areas.deleteAria', { name: area.name })}
                      onClick={() => void handleDelete(area)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Field>
            <FieldLabel htmlFor="location-area-new">{t('areas.nameLabel')}</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="location-area-new"
                value={newName}
                disabled={pending}
                placeholder={t('areas.namePlaceholder')}
                className="min-h-11 touch-manipulation lg:min-h-9"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleAdd()
                  }
                }}
              />
              <Button
                type="button"
                disabled={pending}
                className="touch-manipulation sm:shrink-0"
                onClick={() => void handleAdd()}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {t('areas.addAction')}
              </Button>
            </div>
          </Field>
        </FieldGroup>
      </FieldSet>
    </TabsContent>
  )
}
