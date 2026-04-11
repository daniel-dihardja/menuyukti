'use client'

import { MoreHorizontal, Pencil, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

import {
  createApiAdapterToolAction,
  deleteApiAdapterToolAction,
  updateApiAdapterToolAction,
} from '@/app/(protected)/custom-tools/actions'
import type { ApiAdapterToolRow } from '@/lib/graphql/queries'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
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

export function CustomToolsManager({ workspaceId, workspaceName, initialTools }: Props) {
  const t = useTranslations('customToolsPage')
  const router = useRouter()
  const tools = initialTools

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [editing, setEditing] = useState<ApiAdapterToolRow | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ApiAdapterToolRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const openCreate = () => {
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
  }

  const openEdit = (tool: ApiAdapterToolRow) => {
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
  }

  const handleDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) return
    setFormError(null)
    setFieldErrors({})
    setSaving(true)
    try {
      if (dialogMode === 'create') {
        const res = await createApiAdapterToolAction({
          workspaceId,
          name,
          description,
          url,
          isActive,
        })
        if (!res.ok) {
          if (res.error.toLowerCase().includes('https')) {
            setFieldErrors((prev) => ({ ...prev, url: t('urlInvalid') }))
          }
          setFormError(res.error)
          return
        }
      } else if (editing) {
        const res = await updateApiAdapterToolAction({
          id: editing.id,
          name,
          description,
          url,
          isActive,
        })
        if (!res.ok) {
          if (res.error.toLowerCase().includes('https')) {
            setFieldErrors((prev) => ({ ...prev, url: t('urlInvalid') }))
          }
          setFormError(res.error)
          return
        }
      }
      setDialogOpen(false)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await deleteApiAdapterToolAction(deleteTarget.id)
      if (!res.ok) {
        setDeleteError(res.error)
        return
      }
      setDeleteTarget(null)
      refresh()
    } finally {
      setDeleting(false)
    }
  }

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
      <Alert>
        <AlertTitle>{t('securityTitle')}</AlertTitle>
        <AlertDescription>{t('securityBody')}</AlertDescription>
      </Alert>

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

      {tools.length === 0 ? (
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
                <TableBody>
                  {tools.map((tool) => (
                    <TableRow key={tool.id}>
                      <TableCell className="font-medium">{tool.name}</TableCell>
                      <TableCell className="font-mono text-xs" translate="no">
                        {tool.toolKey}
                      </TableCell>
                      <TableCell
                        className="max-w-[20rem] truncate font-mono text-xs"
                        translate="no"
                      >
                        <span title={tool.url}>{tool.url}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tool.isActive ? 'default' : 'secondary'}>
                          {tool.isActive ? t('badgeActive') : t('badgeInactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(tool)}
                          >
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <ul className="grid gap-4 md:hidden">
            {tools.map((tool) => (
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
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <form onSubmit={(e) => void handleDialogSubmit(e)}>
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
                    type="url"
                    inputMode="url"
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
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
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
            <AlertDialogCancel disabled={deleting}>{t('deleteCancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              className="gap-2"
              onClick={() => void handleDeleteConfirm()}
            >
              {deleting ? (
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
