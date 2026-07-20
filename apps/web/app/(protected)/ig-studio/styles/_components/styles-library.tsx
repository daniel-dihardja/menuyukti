'use client'

import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'

import { deleteStyle, listStyles, type Style } from '@/lib/styles/client-api'
import { mediaDownloadHref } from '@/lib/media/client-api'
import { routes } from '@/lib/routes'

export function StylesLibrary() {
  const t = useTranslations('igStudio.styles')
  const router = useRouter()
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
        <Loader2 className="size-4 animate-spin" aria-hidden />
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
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`${routes.igStudioStyleNew}?path=from-image`}>
              <ImagePlus className="size-4" aria-hidden />
              {t('createFromImage')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.igStudioStyleNew}>
              <Plus className="size-4" aria-hidden />
              {t('add')}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {styles.map((style) => {
        return (
          <li
            key={style.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <button
              type="button"
              className="relative aspect-square w-full overflow-hidden bg-muted/30 text-left"
              onClick={() => router.push(routes.igStudioStyleDetail(style.id))}
              aria-label={t('edit')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- media download URLs */}
              <img
                src={mediaDownloadHref(style.referenceImageName)}
                alt=""
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
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
                aria-label={t('edit')}
                onClick={() => router.push(routes.igStudioStyleDetail(style.id))}
              >
                <Pencil className="size-4" aria-hidden />
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
