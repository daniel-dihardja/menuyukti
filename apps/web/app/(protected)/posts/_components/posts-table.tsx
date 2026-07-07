'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Pencil, SquarePen, Trash2 } from 'lucide-react'

import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '@/app/(protected)/analytics/_components/responsive-action-menu'
import { apiFetch } from '@/lib/api/client-fetch'
import { routes } from '@/lib/routes'
import { CreatePostButton } from './create-post-button'
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

export type PostListItem = {
  id: string
  title: string | null
  status: string
  updatedAt: string | null
}

type PostsTableProps = {
  posts: PostListItem[]
}

function formatUpdatedAt(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function statusBadgeVariant(status: string): 'secondary' | 'outline' | 'default' {
  if (status === 'published') return 'default'
  if (status === 'draft') return 'secondary'
  return 'outline'
}

function displayTitle(post: PostListItem, untitledLabel: string): string {
  return post.title?.trim() || untitledLabel
}

function PostsEmptyState() {
  const t = useTranslations('posts.empty')

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SquarePen aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{t('title')}</EmptyTitle>
        <EmptyDescription>{t('description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreatePostButton />
      </EmptyContent>
    </Empty>
  )
}

export function PostsTable({ posts }: PostsTableProps) {
  const router = useRouter()
  const t = useTranslations('posts.table')
  const tStatus = useTranslations('posts.table.statusLabels')
  const tMobile = useTranslations('posts.table.mobile')
  const locale = useMemo(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language
    }
    return 'en'
  }, [])

  const [rows, setRows] = useState(posts)
  const [pendingDelete, setPendingDelete] = useState<PostListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    setRows(posts)
  }, [posts])

  const actionMenuProps = useMemo(
    () => ({
      mobileTriggerLabel: tMobile('actionsTrigger'),
      sheetDescription: tMobile('sheetDescription'),
    }),
    [tMobile],
  )

  const buildActionItems = useCallback(
    (post: PostListItem): ResponsiveActionMenuItem[] => {
      return [
        {
          id: 'edit',
          label: t('edit'),
          icon: Pencil,
          href: routes.postsDetail(post.id),
        },
        {
          id: 'delete',
          label: t('delete'),
          icon: Trash2,
          destructive: true,
          separatorBefore: true,
          onSelect: () => {
            setDeleteError(null)
            setPendingDelete(post)
          },
        },
      ]
    },
    [t],
  )

  const confirmDeletePost = useCallback(async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const result = await apiFetch<null>(
        `/api/posts/${encodeURIComponent(pendingDelete.id)}`,
        { method: 'DELETE' },
        t('deleteError'),
      )
      if (!result.ok) {
        setDeleteError(result.error)
        return
      }
      setRows((current) => current.filter((row) => row.id !== pendingDelete.id))
      setPendingDelete(null)
      router.refresh()
    } catch {
      setDeleteError(t('deleteError'))
    } finally {
      setDeleting(false)
    }
  }, [pendingDelete, router, t])

  if (rows.length === 0) {
    return <PostsEmptyState />
  }

  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((post) => {
          const title = displayTitle(post, t('untitled'))
          return (
            <li
              key={post.id}
              className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <span className="truncate font-medium" title={title}>
                  {title}
                </span>
                <Badge variant={statusBadgeVariant(post.status)} className="shrink-0">
                  {tStatus(post.status as 'draft' | 'published', {
                    defaultValue: post.status,
                  })}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {t('updated', { date: formatUpdatedAt(post.updatedAt, locale) })}
              </span>
              <ResponsiveActionMenu
                {...actionMenuProps}
                desktopTriggerAriaLabel={t('actionsForRow', { name: title })}
                items={buildActionItems(post)}
                sheetId={`post-actions-${post.id}`}
                sheetTitle={title}
              />
            </li>
          )
        })}
      </ul>

      <div className="-mx-4 hidden w-[calc(100%+2rem)] border-x-0 border-y lg:mx-0 lg:block lg:w-full lg:rounded-md lg:border">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">{t('index')}</TableHead>
              <TableHead>{t('title')}</TableHead>
              <TableHead className="w-[140px]">{t('status')}</TableHead>
              <TableHead className="w-[220px]">{t('updatedAt')}</TableHead>
              <TableHead className="w-[80px] text-right">{t('action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((post, index) => {
              const title = displayTitle(post, t('untitled'))
              return (
                <TableRow key={post.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <span className="truncate font-medium" title={title}>
                      {title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(post.status)} className="w-fit">
                      {tStatus(post.status as 'draft' | 'published', {
                        defaultValue: post.status,
                      })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUpdatedAt(post.updatedAt, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ResponsiveActionMenu
                      {...actionMenuProps}
                      desktopTriggerAriaLabel={t('actionsForRow', { name: title })}
                      items={buildActionItems(post)}
                      sheetId={`post-actions-desktop-${post.id}`}
                      sheetTitle={title}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
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
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
            {deleteError ? (
              <p className="text-destructive text-sm" role="alert">
                {deleteError}
              </p>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} type="button">
              {t('deleteConfirmCancel')}
            </AlertDialogCancel>
            <Button
              className={deleting ? 'inline-flex items-center gap-2' : undefined}
              disabled={deleting}
              onClick={() => void confirmDeletePost()}
              type="button"
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Spinner />
                  {t('deleteConfirmAction')}
                </>
              ) : (
                t('deleteConfirmAction')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
