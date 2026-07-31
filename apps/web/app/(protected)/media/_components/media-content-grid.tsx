'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ImageIcon } from 'lucide-react'

import { ContentMediaGridParts } from '@/app/(protected)/content/_components/content-media-grid'
import { DEFAULT_CONTENT_ASPECT_RATIO } from '@/app/(protected)/content/_components/content-catalog-types'
import { MEDIA_GRID_SKELETON_COUNT } from '@/lib/format-media'
import { mediaDownloadHref } from '@/lib/media/client-api'

import { useMediaActions, useMediaState } from './media-context'

export function MediaContentGrid() {
  const t = useTranslations('media')
  const { loading, items, imageDimensionsByName, deleting, selected, collectionFilter } =
    useMediaState()
  const { handleImageNaturalSize, handleSelect, setPreview, setPendingDeleteName } =
    useMediaActions()

  const emptyLabels =
    collectionFilter === 'all'
      ? {
          emptyTitle: t('grid.empty.title'),
          emptyDescription: t('grid.empty.description'),
        }
      : {
          emptyTitle: t('collections.emptyCollectionTitle'),
          emptyDescription: t('collections.emptyCollectionDescription'),
        }

  const state = useMemo(
    () => ({
      loading,
      items,
      imageDimensionsByName,
      deleting,
      emptyIcon: ImageIcon,
      skeletonCount: MEDIA_GRID_SKELETON_COUNT,
      defaultAspectRatio: DEFAULT_CONTENT_ASPECT_RATIO,
      selectedName: selected?.name ?? null,
      labels: {
        previewImage: t('grid.viewLarge'),
        previewVideo: t('grid.viewLarge'),
        delete: t('grid.delete'),
        download: t('grid.download'),
        select: t('grid.select'),
        moreActions: t('grid.moreActions'),
        emptyTitle: emptyLabels.emptyTitle,
        emptyDescription: emptyLabels.emptyDescription,
      },
    }),
    [
      deleting,
      emptyLabels.emptyDescription,
      emptyLabels.emptyTitle,
      imageDimensionsByName,
      items,
      loading,
      selected?.name,
      t,
    ],
  )

  const actions = useMemo(
    () => ({
      onImageNaturalSize: handleImageNaturalSize,
      onVideoMetadata: handleImageNaturalSize,
      onPreview: setPreview,
      onDeleteRequest: setPendingDeleteName,
      getDownloadHref: mediaDownloadHref,
      onSelect: handleSelect,
    }),
    [handleImageNaturalSize, handleSelect, setPendingDeleteName, setPreview],
  )

  return (
    <ContentMediaGridParts.Provider state={state} actions={actions}>
      <ContentMediaGridParts.View />
    </ContentMediaGridParts.Provider>
  )
}
