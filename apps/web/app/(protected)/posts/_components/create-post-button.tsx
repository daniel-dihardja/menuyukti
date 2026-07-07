'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'

import { apiFetch } from '@/lib/api/client-fetch'
import { routes } from '@/lib/routes'
import { Button } from '@workspace/ui/components/button'

type CreatePostResponse = {
  id: string
}

export function CreatePostButton() {
  const t = useTranslations('posts')
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setCreating(true)
    setError(null)
    const result = await apiFetch<CreatePostResponse>(
      '/api/posts/create',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      t('createError'),
    )
    setCreating(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.push(routes.canvasPostCreatorWithId(result.data.id))
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        type="button"
        className="w-full shrink-0 sm:w-auto"
        size="sm"
        disabled={creating}
        onClick={() => void handleCreate()}
      >
        <Plus className="size-4" aria-hidden />
        {creating ? t('creating') : t('create')}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
