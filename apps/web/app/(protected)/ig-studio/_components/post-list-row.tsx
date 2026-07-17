'use client'

import { useTranslations } from 'next-intl'

import {
  ResponsiveActionMenu,
  type ResponsiveActionMenuItem,
} from '@/app/(protected)/analytics/_components/responsive-action-menu'
import { Badge } from '@workspace/ui/components/badge'
import { TableCell } from '@workspace/ui/components/table'

import { PostTitleEditor } from './post-title-editor'
import {
  displayTitle,
  formatUpdatedAt,
  statusBadgeVariant,
  type PostListItem,
} from './posts-table-types'
import type { usePostTitleEdit } from './use-post-title-edit'

type TitleEdit = ReturnType<typeof usePostTitleEdit>

type PostListCardProps = {
  post: PostListItem
  locale: string
  titleEdit: TitleEdit
  actionMenuProps: {
    mobileTriggerLabel: string
    sheetDescription: string
  }
  buildActionItems: (post: PostListItem) => ResponsiveActionMenuItem[]
}

export function PostListCard({
  post,
  locale,
  titleEdit,
  actionMenuProps,
  buildActionItems,
}: PostListCardProps) {
  const t = useTranslations('posts.table')
  const tStatus = useTranslations('posts.table.statusLabels')
  const title = displayTitle(post, titleEdit.untitledLabel)

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <PostTitleEditor
          post={post}
          className="min-w-0 flex-1"
          untitledLabel={titleEdit.untitledLabel}
          editingId={titleEdit.editingId}
          draftTitle={titleEdit.draftTitle}
          saving={titleEdit.saving}
          renameError={titleEdit.renameError}
          editContainerRef={titleEdit.editContainerRef}
          onDraftChange={titleEdit.setDraftTitle}
          onStartEdit={titleEdit.startEdit}
          onSaveEdit={titleEdit.saveEdit}
          onDraftKeyDown={titleEdit.onDraftKeyDown}
          editTitleAria={titleEdit.editTitleAria}
          saveTitleAria={titleEdit.saveTitleAria}
          titleLabel={titleEdit.titleLabel}
        />
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
}

type PostTableRowProps = {
  post: PostListItem
  index: number
  locale: string
  titleEdit: TitleEdit
  actionMenuProps: {
    mobileTriggerLabel: string
    sheetDescription: string
  }
  buildActionItems: (post: PostListItem) => ResponsiveActionMenuItem[]
}

export function PostTableRow({
  post,
  index,
  locale,
  titleEdit,
  actionMenuProps,
  buildActionItems,
}: PostTableRowProps) {
  const t = useTranslations('posts.table')
  const tStatus = useTranslations('posts.table.statusLabels')
  const title = displayTitle(post, titleEdit.untitledLabel)

  return (
    <>
      <TableCell>{index + 1}</TableCell>
      <TableCell className="min-w-0 max-w-[min(100%,24rem)]">
        <PostTitleEditor
          post={post}
          untitledLabel={titleEdit.untitledLabel}
          editingId={titleEdit.editingId}
          draftTitle={titleEdit.draftTitle}
          saving={titleEdit.saving}
          renameError={titleEdit.renameError}
          editContainerRef={titleEdit.editContainerRef}
          onDraftChange={titleEdit.setDraftTitle}
          onStartEdit={titleEdit.startEdit}
          onSaveEdit={titleEdit.saveEdit}
          onDraftKeyDown={titleEdit.onDraftKeyDown}
          editTitleAria={titleEdit.editTitleAria}
          saveTitleAria={titleEdit.saveTitleAria}
          titleLabel={titleEdit.titleLabel}
        />
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
    </>
  )
}
