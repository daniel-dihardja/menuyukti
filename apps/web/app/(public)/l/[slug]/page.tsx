import type { Metadata } from 'next'
import { connection } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { loadPublicLocationWall } from '@/lib/public-wall/load-public-wall'
import { cn } from '@workspace/ui/lib/utils'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('public.wall')
  const { slug } = await params
  try {
    const wall = await loadPublicLocationWall(decodeURIComponent(slug))
    if (!wall) {
      return { title: t('notFoundTitle') }
    }
    const title = wall.tagline ? `${wall.name} · ${wall.tagline}` : wall.name
    return {
      title,
      description: wall.tagline ?? t('metaDescription', { name: wall.name }),
      openGraph: {
        title,
        description: wall.tagline ?? t('metaDescription', { name: wall.name }),
      },
    }
  } catch {
    return { title: t('notFoundTitle') }
  }
}

export default async function PublicLocationWallPage({ params }: PageProps) {
  await connection()
  const t = await getTranslations('public.wall')
  const { slug } = await params
  const wall = await loadPublicLocationWall(decodeURIComponent(slug))
  if (!wall) notFound()

  const favorites = wall.tiles.filter((tile) => tile.kind === 'favorite')
  const combos = wall.tiles.filter((tile) => tile.kind === 'combo')

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="relative flex min-h-[42vh] flex-col justify-end overflow-hidden px-6 pb-12 pt-20 sm:px-10 sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.92_0.02_80)_0%,_transparent_55%),linear-gradient(to_bottom,_oklch(0.97_0.01_80),_oklch(0.94_0.02_70))]"
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-[0.2em] uppercase">
            {t('eyebrow')}
          </p>
          <h1 className="font-heading text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
            {wall.name}
          </h1>
          {wall.tagline ? (
            <p className="text-muted-foreground mt-4 max-w-2xl text-lg text-pretty sm:text-xl">
              {wall.tagline}
            </p>
          ) : null}
        </div>
      </header>

      <main id="wall-main" className="mx-auto w-full max-w-5xl px-6 pb-20 sm:px-10">
        {wall.tiles.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">{t('empty')}</p>
        ) : (
          <div className="flex flex-col gap-14">
            {favorites.length > 0 ? (
              <section aria-labelledby="favorites-heading">
                <h2
                  id="favorites-heading"
                  className="mb-6 text-sm font-semibold tracking-wide uppercase"
                >
                  {t('favoritesHeading')}
                </h2>
                <ul className="columns-1 gap-4 sm:columns-2">
                  {favorites.map((tile, index) => (
                    <WallTileCard key={tile.key} tile={tile} priority={index === 0} />
                  ))}
                </ul>
              </section>
            ) : null}

            {combos.length > 0 ? (
              <section aria-labelledby="combos-heading">
                <h2
                  id="combos-heading"
                  className="mb-6 text-sm font-semibold tracking-wide uppercase"
                >
                  {t('combosHeading')}
                </h2>
                <ul className="columns-1 gap-4 sm:columns-2">
                  {combos.map((tile) => (
                    <WallTileCard key={tile.key} tile={tile} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </div>
  )
}

function WallTileCard({
  tile,
  priority = false,
}: {
  tile: {
    title: string
    description: string | null
    imageUrl: string | null
  }
  priority?: boolean
}) {
  return (
    <li className="mb-4 break-inside-avoid">
      <article
        className={cn(
          'overflow-hidden rounded-none',
          tile.imageUrl ? 'bg-muted' : 'border-border border bg-transparent',
        )}
      >
        {tile.imageUrl ? (
          // Presigned S3 URLs expire; next/image optimizer cannot reliably refetch.
          // eslint-disable-next-line @next/next/no-img-element -- short-lived presigned GET
          <img
            src={tile.imageUrl}
            alt={tile.title}
            className="h-auto w-full object-cover"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : null}
        <div className={cn('px-1', tile.imageUrl ? 'pt-3 pb-1' : 'p-4')}>
          <h3 className="text-base font-medium tracking-tight">{tile.title}</h3>
          {tile.description ? (
            <p className="text-muted-foreground mt-1 text-sm text-pretty">{tile.description}</p>
          ) : null}
        </div>
      </article>
    </li>
  )
}
