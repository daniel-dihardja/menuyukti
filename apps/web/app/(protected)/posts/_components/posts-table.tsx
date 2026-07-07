'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { SquarePen } from 'lucide-react'

import { CreatePostButton } from './create-post-button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
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
  const t = useTranslations('posts.table')
  const tStatus = useTranslations('posts.table.statusLabels')
  const locale = useMemo(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language
    }
    return 'en'
  }, [])

  if (posts.length === 0) {
    return <PostsEmptyState />
  }

  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {posts.map((post) => {
          const title = post.title?.trim() || t('untitled')
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post, index) => {
              const title = post.title?.trim() || t('untitled')
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
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
