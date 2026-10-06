'use client'

import { useCallback, useEffect, useState } from 'react'

import { readPosShowItemImages, writePosShowItemImages } from './pos-utils'

const DEFAULT_SHOW_ITEM_IMAGES = true

export function usePosShowItemImages(): {
  showItemImages: boolean
  setShowItemImages: (show: boolean) => void
} {
  const [showItemImages, setShowItemImagesState] = useState(DEFAULT_SHOW_ITEM_IMAGES)

  useEffect(() => {
    setShowItemImagesState(readPosShowItemImages() ?? DEFAULT_SHOW_ITEM_IMAGES)
  }, [])

  const setShowItemImages = useCallback((show: boolean) => {
    setShowItemImagesState(show)
    writePosShowItemImages(show)
  }, [])

  return { showItemImages, setShowItemImages }
}
