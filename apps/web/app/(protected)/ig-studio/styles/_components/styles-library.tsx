'use client'

import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'

import { deleteStyle, listStyles, type Style } from '@/lib/styles/client-api'
import { mediaDownloadHref } from '@/lib/media/client-api'
import { routes } from '@/lib/routes'

export function StylesLibrary() {
  const t = useTranslations('igStudio.styles')
  const [styles, setStyles] = useState<Style[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listStyles()
      setStyles(list)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.loadError'))
      setStyles([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleDelete = async (style: Style) => {
    if (!window.confirm(t('deleteConfirm', { name: style.name }))) return
    try {
      await deleteStyle(style.id)
      toast.success(t('toast.deleted'))
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.deleteError'))
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner />
        {t('loading')}
      </div>
    )
  }

  if (styles.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border/70 p-8">
        <div className="space-y-1">
          <p className="text-base font-semibold">{t('emptyTitle')}</p>
          <p className="text-muted-foreground max-w-md text-sm">{t('emptyDescription')}</p>
        </div>
        <Button asChild>
          <Link href={routes.igStudioStyleNew}>
            <Plus className="size-4" aria-hidden />
            {t('add')}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {styles.map((style) => {
        const detailHref = routes.igStudioStyleDetail(style.id)
        return (
          <li
            key={style.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <Link
              href={detailHref}
              className="relative aspect-square w-full overflow-hidden bg-muted/30 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t('openNamed', { name: style.name })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- media download URLs */}
              <img
                src={mediaDownloadHref(style.referenceImageName)}
                alt=""
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </Link>
            <div className="flex items-start gap-2 p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium">{style.name}</p>
                <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                  {style.isDefault ? <span>{t('defaultBadge')}</span> : null}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t('editNamed', { name: style.name })}
                asChild
              >
                <Link href={detailHref}>
                  <Pencil className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t('delete')}
                onClick={() => void handleDelete(style)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
