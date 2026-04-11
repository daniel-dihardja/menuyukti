'use client'

import { MoreHorizontal, Pencil, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from 'react'

import {
  createApiAdapterToolAction,
  deleteApiAdapterToolAction,
  updateApiAdapterToolAction,
} from '@/app/(protected)/custom-tools/actions'
import type { ApiAdapterToolRow } from '@/lib/graphql/queries'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { Switch } from '@workspace/ui/components/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Textarea } from '@workspace/ui/components/textarea'

type Props = {
  workspaceId: string | null
  workspaceName: string | null
  initialTools: ApiAdapterToolRow[]
}

type DialogMode = 'create' | 'edit'

type OptimisticToolAction =
  | { type: 'add'; tool: ApiAdapterToolRow }
  | { type: 'patch'; tool: ApiAdapterToolRow }
  | { type: 'remove'; id: string }

function reduceTools(
  state: ApiAdapterToolRow[],
  action: OptimisticToolAction,
): ApiAdapterToolRow[] {
  switch (action.type) {
    case 'add':
      return [...state, action.tool]
    case 'patch':
      return state.map((t) => (t.id === action.tool.id ? action.tool : t))
    case 'remove':
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

function makePendingCreateTool(
  workspaceId: string,
  name: string,
  description: string,
  url: string,
  isActive: boolean,
): ApiAdapterToolRow {
  const now = new Date().toISOString()
  return {
    id: `optimistic:${crypto.randomUUID()}`,
    workspaceId,
    toolKey: '…',
    name,
    description,
    url,
    isActive,
    createdAt: now,
    updatedAt: now,
  }
}

export function CustomToolsManager({ workspaceId, workspaceName, initialTools }: Props) {
  const t = useTranslations('customToolsPage')
  const [tools, setTools] = useState(initialTools)
  useEffect(() => {
    setTools(initialTools)
  }, [initialTools])

  const [displayTools, applyToolOptimistic] = useOptimistic(tools, reduceTools)

  const [formPending, startFormTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [editing, setEditing] = useState<ApiAdapterToolRow | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ApiAdapterToolRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const openCreate = useCallback(() => {
    setDeleteError(null)
    setDialogMode('create')
    setEditing(null)
    setName('')
    setDescription('')
    setUrl('')
    setIsActive(true)
    setFieldErrors({})
    setFormError(null)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((tool: ApiAdapterToolRow) => {
    setDeleteError(null)
    setDialogMode('edit')
    setEditing(tool)
    setName(tool.name)
    setDescription(tool.description)
    setUrl(tool.url)
    setIsActive(tool.isActive)
    setFieldErrors({})
    setFormError(null)
    setDialogOpen(true)
  }, [])

  const handleDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) return
    setFormError(null)
    setFieldErrors({})

    startFormTransition(async () => {
      if (dialogMode === 'create') {
        const pending = makePendingCreateTool(workspaceId, name, description, url, isActive)
        applyToolOptimistic({ type: 'add', tool: pending })
        const res = await createApiAdapterToolAction({
          workspaceId,
          name,
          description,
          url,
          isActive,
        })
        if (!res.ok) {
          if (res.error.toLowerCase().includes('url')) {
            setFieldErrors((prev) => ({ ...prev, url: res.error }))
          }
          setFormError(res.error)
          return
        }
        setTools((prev) => [...prev.filter((x) => x.id !== pending.id), res.tool])
        setDialogOpen(false)
        return
      }

      if (dialogMode === 'edit' && editing) {
        const patched: ApiAdapterToolRow = {
          ...editing,
          name,
          description,
          url,
          isActive,
        }
        applyToolOptimistic({ type: 'patch', tool: patched })
        const res = await updateApiAdapterToolAction({
          id: editing.id,
          name,
          description,
          url,
          isActive,
        })
        if (!res.ok) {
          if (res.error.toLowerCase().includes('url')) {
            setFieldErrors((prev) => ({ ...prev, url: res.error }))
          }
          setFormError(res.error)
          return
        }
        setTools((prev) => prev.map((x) => (x.id === res.tool.id ? res.tool : x)))
        setDialogOpen(false)
      }
    })
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    startDeleteTransition(async () => {
      applyToolOptimistic({ type: 'remove', id })
      const res = await deleteApiAdapterToolAction(id)
      if (!res.ok) {
        setDeleteError(res.error)
        return
      }
      setTools((prev) => prev.filter((x) => x.id !== id))
      setDeleteTarget(null)
    })
  }

  const { desktopRows, mobileCards } = useMemo(() => {
    const dRows: ReactNode[] = []
    const mCards: ReactNode[] = []
    for (const tool of displayTools) {
      dRows.push(
        <TableRow key={tool.id}>
          <TableCell className="font-medium">{tool.name}</TableCell>
          <TableCell className="font-mono text-xs" translate="no">
            {tool.toolKey}
          </TableCell>
          <TableCell className="max-w-[20rem] truncate font-mono text-xs" translate="no">
            <span title={tool.url}>{tool.url}</span>
          </TableCell>
          <TableCell>
            <Badge variant={tool.isActive ? 'default' : 'secondary'}>
              {tool.isActive ? t('badgeActive') : t('badgeInactive')}
            </Badge>
          </TableCell>
          <TableCell className="text-end">
            <div className="flex justify-end gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(tool)}>
                {t('edit')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(tool)}
              >
                {t('delete')}
              </Button>
            </div>
          </TableCell>
        </TableRow>,
      )
      mCards.push(
        <li key={tool.id}>
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <CardHeader className="flex flex-col gap-2 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base leading-snug">{tool.name}</CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs" translate="no">
                    {tool.toolKey}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={tool.isActive ? 'default' : 'secondary'}>
                    {tool.isActive ? t('badgeActive') : t('badgeInactive')}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t('actions')}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onSelect={() => openEdit(tool)}>
                          <Pencil className="size-4" aria-hidden />
                          {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteTarget(tool)}
                        >
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-3">
              <p className="text-muted-foreground line-clamp-3 text-sm">{tool.description}</p>
              <p
                className="truncate font-mono text-xs text-muted-foreground"
                title={tool.url}
                translate="no"
              >
                {tool.url}
              </p>
            </CardContent>
          </Card>
        </li>,
      )
    }
    return { desktopRows: dRows, mobileCards: mCards }
  }, [displayTools, openEdit, t])

  if (!workspaceId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>{t('emptyWorkspaceTitle')}</CardTitle>
          <CardDescription>{t('emptyWorkspaceDescription')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {deleteError ? (
        <Alert variant="destructive">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {workspaceName ? (
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">{workspaceName}</span>
          </p>
        ) : (
          <span />
        )}
        <Button type="button" className="gap-2" onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" aria-hidden />
          {t('addTool')}
        </Button>
      </div>

      {displayTools.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>{t('emptyListTitle')}</CardTitle>
            <CardDescription>{t('emptyListDescription')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('colName')}</TableHead>
                    <TableHead>{t('colKey')}</TableHead>
                    <TableHead className="min-w-[12rem]">{t('colUrl')}</TableHead>
                    <TableHead className="w-[100px]">{t('colStatus')}</TableHead>
                    <TableHead className="w-[120px] text-end">{t('colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{desktopRows}</TableBody>
              </Table>
            </div>
          </div>

          <ul className="grid gap-4 md:hidden">{mobileCards}</ul>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <form onSubmit={handleDialogSubmit}>
            <DialogHeader>
              <DialogTitle>{dialogMode === 'create' ? t('addTool') : t('editTool')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-6 py-4">
              {formError ? (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}
              <FieldGroup>
                <Field data-invalid={!!fieldErrors.name}>
                  <FieldLabel htmlFor="ct-name">{t('fieldName')}</FieldLabel>
                  <Input
                    id="ct-name"
                    name="name"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    autoComplete="off"
                    aria-invalid={!!fieldErrors.name}
                    required
                  />
                  <FieldDescription>{t('fieldNameHint')}</FieldDescription>
                  {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
                </Field>
                <Field data-invalid={!!fieldErrors.description}>
                  <FieldLabel htmlFor="ct-desc">{t('fieldDescription')}</FieldLabel>
                  <Textarea
                    id="ct-desc"
                    name="description"
                    value={description}
                    onChange={(ev) => setDescription(ev.target.value)}
                    rows={4}
                    aria-invalid={!!fieldErrors.description}
                    required
                    className="min-h-[100px] resize-y"
                  />
                  <FieldDescription>{t('fieldDescriptionHint')}</FieldDescription>
                  {fieldErrors.description ? (
                    <FieldError>{fieldErrors.description}</FieldError>
                  ) : null}
                </Field>
                <Field data-invalid={!!fieldErrors.url}>
                  <FieldLabel htmlFor="ct-url">{t('fieldUrl')}</FieldLabel>
                  <Input
                    id="ct-url"
                    name="url"
                    type="text"
                    value={url}
                    onChange={(ev) => setUrl(ev.target.value)}
                    autoComplete="off"
                    aria-invalid={!!fieldErrors.url}
                    required
                    translate="no"
                  />
                  <FieldDescription>{t('fieldUrlHint')}</FieldDescription>
                  {fieldErrors.url ? <FieldError>{fieldErrors.url}</FieldError> : null}
                </Field>
                <Field
                  orientation="horizontal"
                  className="items-center justify-between rounded-lg border p-4"
                >
                  <FieldLabel htmlFor="ct-active" className="mb-0">
                    {t('fieldActive')}
                  </FieldLabel>
                  <Switch
                    id="ct-active"
                    checked={isActive}
                    onCheckedChange={(v) => setIsActive(!!v)}
                  />
                </Field>
              </FieldGroup>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={formPending} className="gap-2">
                {formPending ? (
                  <>
                    <Spinner className="size-4" />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>{t('deleteCancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              className="gap-2"
              onClick={() => void handleDeleteConfirm()}
            >
              {deletePending ? (
                <>
                  <Spinner className="size-4" />
                  {t('deleting')}
                </>
              ) : (
                t('deleteConfirm')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
