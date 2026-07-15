export type PostListItem = {
  id: string
  title: string | null
  status: string
  updatedAt: string | null
}

export function displayTitle(post: PostListItem, untitledLabel: string): string {
  return post.title?.trim() || untitledLabel
}

export function formatUpdatedAt(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function statusBadgeVariant(status: string): 'secondary' | 'outline' | 'default' {
  if (status === 'published') return 'default'
  if (status === 'draft') return 'secondary'
  return 'outline'
}
