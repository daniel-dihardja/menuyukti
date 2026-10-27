'use client'

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import type {
  MenuItemFeedbackRow,
  MenuItemFeedbackStatus,
} from '@/lib/graphql/queries/menu-item-feedback'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import { Label } from '@workspace/ui/components/label'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group'

type FilterKey = 'all' | 'replied' | MenuItemFeedbackStatus

type Props = {
  locationId: number
  initialFeedbacks: MenuItemFeedbackRow[]
  initialPendingCount: number
}

function statusBadgeVariant(status: MenuItemFeedbackStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'PUBLISHED') return 'default'
  if (status === 'PENDING') return 'secondary'
  return 'outline'
}

export function DigitalMenuFeedbackInbox({
  locationId,
  initialFeedbacks,
  initialPendingCount,
}: Props) {
  const t = useTranslations('services.digitalMenu.console.feedback')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const [pendingCount, setPendingCount] = useState(initialPendingCount)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return feedbacks
    if (filter === 'replied') {
      return feedbacks.filter((row) => Boolean(row.ownerReply?.trim()))
    }
    return feedbacks.filter((row) => row.status === filter)
  }, [feedbacks, filter])

  const selected = selectedId != null ? feedbacks.find((row) => row.id === selectedId) : null

  function openDetail(row: MenuItemFeedbackRow) {
    setSelectedId(row.id)
    setReply(row.ownerReply ?? '')
    setError(null)
  }

  function upsertRow(next: Partial<MenuItemFeedbackRow> & { id: number }) {
    setFeedbacks((prev) => {
      const updated = prev.map((row) => (row.id === next.id ? { ...row, ...next } : row))
      setPendingCount(updated.filter((row) => row.status === 'PENDING').length)
      return updated
    })
  }

  async function patchFeedback(action: 'reply' | 'publish' | 'hide', replyText?: string) {
    if (selectedId == null) return
    setBusy(true)
    setError(null)
    try {
      const body = action === 'reply' ? { action, reply: replyText ?? reply } : { action }
      const res = await fetch(`/api/locations/${locationId}/menu/feedback/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
        message?: string
      }
      if (!res.ok) {
        setError(payload.message || t('actionFailed'))
        return
      }
      if (action === 'reply') {
        upsertRow({
          id: selectedId,
          ownerReply: typeof payload.ownerReply === 'string' ? payload.ownerReply : reply,
          ownerRepliedAt:
            typeof payload.ownerRepliedAt === 'string' ? payload.ownerRepliedAt : null,
        })
      } else if (action === 'publish') {
        upsertRow({
          id: selectedId,
          status: 'PUBLISHED',
          publishedAt: typeof payload.publishedAt === 'string' ? payload.publishedAt : null,
        })
      } else {
        upsertRow({ id: selectedId, status: 'HIDDEN' })
      }
    } catch {
      setError(t('actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-border flex max-w-xl flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t('title')}</h2>
        {pendingCount > 0 ? (
          <Badge variant="secondary">{t('pendingBadge', { count: pendingCount })}</Badge>
        ) : null}
      </div>

      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => {
          if (value) setFilter(value as FilterKey)
        }}
        className="flex flex-wrap justify-start gap-2"
      >
        {(
          [
            ['all', 'filterAll'],
            ['PENDING', 'filterPending'],
            ['replied', 'filterReplied'],
            ['PUBLISHED', 'filterPublished'],
            ['HIDDEN', 'filterHidden'],
          ] as const
        ).map(([value, labelKey]) => (
          <ToggleGroupItem
            key={value}
            value={value}
            className="h-9 min-h-9 rounded-full px-3 text-xs"
          >
            {t(labelKey)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          <p>{t('empty')}</p>
          <p className="text-xs">{t('emptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((row) => (
            <li key={row.id} className="border-border rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {row.sentiment === 'POSITIVE' ? (
                      <ThumbsUp className="size-3.5 shrink-0" aria-hidden />
                    ) : row.sentiment === 'NEGATIVE' ? (
                      <ThumbsDown className="size-3.5 shrink-0" aria-hidden />
                    ) : null}
                    <p className="truncate text-sm font-medium">{row.menuItemName}</p>
                    <Badge variant={statusBadgeVariant(row.status)} className="type-caption">
                      {row.status === 'PENDING'
                        ? t('statusPending')
                        : row.status === 'PUBLISHED'
                          ? t('statusPublished')
                          : t('statusHidden')}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-sm">{row.body}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => openDetail(row)}
                >
                  {t('openDetail')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        <DrawerContent className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden">
          <DrawerHeader className="shrink-0 border-b text-left">
            <DrawerTitle>{t('detailTitle')}</DrawerTitle>
            <DrawerDescription>
              {selected ? `${t('itemLabel')}: ${selected.menuItemName}` : undefined}
            </DrawerDescription>
          </DrawerHeader>
          {selected ? (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="flex items-center gap-2 text-sm">
                {selected.sentiment === 'POSITIVE' ? (
                  <>
                    <ThumbsUp className="size-4" aria-hidden />
                    <span>{t('sentimentPositive')}</span>
                  </>
                ) : selected.sentiment === 'NEGATIVE' ? (
                  <>
                    <ThumbsDown className="size-4" aria-hidden />
                    <span>{t('sentimentNegative')}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{t('sentimentNone')}</span>
                )}
                <Badge variant={statusBadgeVariant(selected.status)}>
                  {selected.status === 'PENDING'
                    ? t('statusPending')
                    : selected.status === 'PUBLISHED'
                      ? t('statusPublished')
                      : t('statusHidden')}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {t('guestLabel')}
                </p>
                <p className="text-sm">
                  {selected.guestDisplayName?.trim() || t('anonymousGuest')}
                </p>
              </div>
              <p className="text-sm text-pretty">{selected.body}</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="owner-feedback-reply">{t('replyLabel')}</Label>
                <Textarea
                  id="owner-feedback-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t('replyPlaceholder')}
                  maxLength={500}
                  rows={3}
                />
              </div>
              {error ? <p className="text-destructive text-sm">{error}</p> : null}
            </div>
          ) : null}
          <DrawerFooter className="shrink-0 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="min-h-11 w-full touch-manipulation"
                disabled={busy || !reply.trim()}
                onClick={() => void patchFeedback('reply')}
              >
                {busy ? <Spinner /> : null}
                {busy ? t('savingReply') : t('saveReply')}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 touch-manipulation"
                  disabled={busy || selected?.status === 'PUBLISHED'}
                  onClick={() => void patchFeedback('publish')}
                >
                  {busy ? t('publishing') : t('publish')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 touch-manipulation"
                  disabled={busy || selected?.status === 'HIDDEN'}
                  onClick={() => void patchFeedback('hide')}
                >
                  {busy ? t('hiding') : t('hide')}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 w-full touch-manipulation"
                onClick={() => setSelectedId(null)}
              >
                {t('close')}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </section>
  )
}
