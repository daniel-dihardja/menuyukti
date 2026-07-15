'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Pencil, SquarePen, Trash2 } from 'lucide-react'

import { type ResponsiveActionMenuItem } from '@/app/(protected)/analytics/_components/responsive-action-menu'
import { apiFetch } from '@/lib/api/client-fetch'
import { routes } from '@/lib/routes'
import { CreatePostButton } from './create-post-button'
import { DeletePostDialog } from './delete-post-dialog'
import { PostListCard, PostTableRow } from './post-list-row'
import { type PostListItem } from './posts-table-types'
import { usePostTitleEdit } from './use-post-title-edit'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table'

export type { PostListItem } from './posts-table-types'

type PostsTableProps = {
  posts: PostListItem[]
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

  const titleEdit = usePostTitleEdit({ rows, setRows })

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
          href: routes.igStudioDetail(post.id),
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
        {rows.map((post) => (
          <PostListCard
            key={post.id}
            post={post}
            locale={locale}
            titleEdit={titleEdit}
            actionMenuProps={actionMenuProps}
            buildActionItems={buildActionItems}
          />
        ))}
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
            {rows.map((post, index) => (
              <TableRow key={post.id}>
                <PostTableRow
                  post={post}
                  index={index}
                  locale={locale}
                  titleEdit={titleEdit}
                  actionMenuProps={actionMenuProps}
                  buildActionItems={buildActionItems}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DeletePostDialog
        pendingDelete={pendingDelete}
        deleting={deleting}
        deleteError={deleteError}
        onOpenChange={(open) => {
          if (open) return
          if (deleting) return
          setPendingDelete(null)
          setDeleteError(null)
        }}
        onConfirm={() => void confirmDeletePost()}
      />
    </>
  )
}
