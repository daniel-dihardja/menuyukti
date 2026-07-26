'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Input } from '@workspace/ui/components/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
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
import { Spinner } from '@workspace/ui/components/spinner'
import { Check, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { routes } from '@/lib/routes'

export type WorkflowTableRow = {
  id: string
  name: string
}

interface WorkflowsTableProps {
  workflows: WorkflowTableRow[]
  onWorkflowRenamed?: (id: string, name: string) => void
  onWorkflowDeleted?: (id: string) => void
}

export function WorkflowsTableSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-5 w-56" />
      <div className="-mx-4 w-[calc(100%+2rem)] border-x-0 border-y lg:mx-0 lg:w-full lg:rounded-md lg:border">
        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="flex gap-4 border-b pb-2">
            <Skeleton className="h-4 w-8 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-4 w-10 shrink-0" />
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div className="flex gap-4" key={`skeleton-row-${i}`}>
              <Skeleton className="h-4 w-8 shrink-0" />
              <Skeleton className="h-4 min-w-0 flex-1" />
              <Skeleton className="h-4 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function WorkflowsTable({
  workflows,
  onWorkflowRenamed,
  onWorkflowDeleted,
}: WorkflowsTableProps) {
  const t = useTranslations('analytics.workflows')
  const tTable = useTranslations('analytics.workflows.table')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [saving, setSaving] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const editContainerRef = useRef<HTMLDivElement>(null)

  const [pendingDelete, setPendingDelete] = useState<WorkflowTableRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setDraftName('')
    setRenameError(null)
  }, [])

  useEffect(() => {
    if (editingId === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelEdit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingId, cancelEdit])

  useEffect(() => {
    if (editingId === null) return
    const onPointerDown = (e: PointerEvent) => {
      if (saving) return
      const el = editContainerRef.current
      if (!el?.contains(e.target as Node)) {
        cancelEdit()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [editingId, saving, cancelEdit])

  const startEdit = useCallback((row: WorkflowTableRow) => {
    setEditingId(row.id)
    setDraftName(row.name)
    setRenameError(null)
  }, [])

  const saveEdit = useCallback(async () => {
    if (editingId === null || saving) return
    const trimmed = draftName.trim()
    if (!trimmed) return

    const row = workflows.find((c) => c.id === editingId)
    if (row && trimmed === row.name) {
      cancelEdit()
      return
    }

    setSaving(true)
    setRenameError(null)
    try {
      const res = await fetch(`/api/workflows/${encodeURIComponent(editingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setRenameError(body?.message ?? tTable('renameError'))
        return
      }
      const updated = (await res.json()) as { name?: string }
      const nextName = updated.name ?? trimmed
      onWorkflowRenamed?.(editingId, nextName)
      cancelEdit()
    } catch {
      setRenameError(tTable('renameError'))
    } finally {
      setSaving(false)
    }
  }, [workflows, cancelEdit, draftName, editingId, onWorkflowRenamed, saving, tTable])

  const onDraftKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void saveEdit()
      }
    },
    [saveEdit],
  )

  const confirmDeleteWorkflow = useCallback(async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/workflows/${encodeURIComponent(pendingDelete.id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setDeleteError(body?.message ?? tTable('deleteError'))
        return
      }
      onWorkflowDeleted?.(pendingDelete.id)
      setPendingDelete(null)
    } catch {
      setDeleteError(tTable('deleteError'))
    } finally {
      setDeleting(false)
    }
  }, [onWorkflowDeleted, pendingDelete, tTable])

  return (
    <section aria-labelledby="workflows-list-heading" className="flex flex-col gap-3">
      <h2 id="workflows-list-heading" className="text-sm font-semibold">
        {t('sectionTitle')}
      </h2>
      <div className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto border-x-0 border-y lg:mx-0 lg:w-full lg:rounded-md lg:border">
        <Table className="w-full min-w-[20rem]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">{tTable('index')}</TableHead>
              <TableHead>{tTable('name')}</TableHead>
              <TableHead className="w-[80px] text-right">{tTable('action')}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {workflows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="min-w-0 max-w-[min(100%,24rem)]">
                  {editingId === row.id ? (
                    <div ref={editContainerRef} className="flex flex-col gap-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Input
                          aria-invalid={renameError ? true : undefined}
                          aria-label={tTable('name')}
                          name="workflowName"
                          className="min-w-0 flex-1"
                          disabled={saving}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={onDraftKeyDown}
                          value={draftName}
                        />
                        <Button
                          aria-label={tTable('saveNameAria')}
                          disabled={saving || draftName.trim().length === 0}
                          onClick={() => void saveEdit()}
                          size="icon-sm"
                          type="button"
                          variant="secondary"
                        >
                          {saving ? <Spinner /> : <Check aria-hidden />}
                        </Button>
                      </div>
                      {renameError ? (
                        <p className="text-destructive text-sm" role="alert">
                          {renameError}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-1">
                      <Link
                        className="min-w-0 flex-1 truncate font-medium text-foreground underline-offset-4 hover:underline"
                        href={routes.workflows.detail(row.id)}
                        title={row.name}
                      >
                        {row.name}
                      </Link>
                      <Button
                        aria-label={tTable('editNameAria')}
                        className="shrink-0"
                        onClick={() => startEdit(row)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil aria-hidden />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={tTable('actionsForRow', { name: row.name })}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <MoreHorizontal aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          className="flex items-center gap-2"
                          href={routes.workflows.detail(row.id)}
                        >
                          <Eye aria-hidden />
                          {tTable('view')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={deleting && pendingDelete?.id === row.id}
                        onSelect={(e) => {
                          e.preventDefault()
                          setDeleteError(null)
                          setPendingDelete(row)
                        }}
                      >
                        <Trash2 aria-hidden className="size-4" />
                        {tTable('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (open) return
          if (deleting) return
          setPendingDelete(null)
          setDeleteError(null)
        }}
        open={pendingDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tTable('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{tTable('deleteConfirmDescription')}</AlertDialogDescription>
            {deleteError ? (
              <p className="text-destructive text-sm" role="alert">
                {deleteError}
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} type="button">
              {tTable('deleteConfirmCancel')}
            </AlertDialogCancel>
            <Button
              className={deleting ? 'inline-flex items-center gap-2' : undefined}
              disabled={deleting}
              onClick={() => void confirmDeleteWorkflow()}
              type="button"
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Spinner />
                  {tTable('deleteConfirmAction')}
                </>
              ) : (
                tTable('deleteConfirmAction')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
