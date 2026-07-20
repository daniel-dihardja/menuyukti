'use client'

import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getStyle, type Style } from '@/lib/styles/client-api'

import { StyleEditor } from '../_components/style-editor'

export function StyleEditLoader() {
  const t = useTranslations('igStudio.styles')
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const [style, setStyle] = useState<Style | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setError(true)
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const row = await getStyle(id)
        if (!cancelled) setStyle(row)
      } catch (err) {
        if (!cancelled) {
          setError(true)
          toast.error(err instanceof Error ? err.message : t('toast.loadError'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, t])

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t('loading')}
      </div>
    )
  }

  if (error || !style) {
    return <p className="text-muted-foreground text-sm">{t('notFound')}</p>
  }

  return <StyleEditor mode="edit" style={style} />
}
