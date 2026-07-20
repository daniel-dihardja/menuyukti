'use client'

import { use } from 'react'

import { PostCreatorContext } from './post-creator-context'
import type { PostCreatorContextValue } from './types'

export function usePostCreator(): PostCreatorContextValue {
  const value = use(PostCreatorContext)
  if (!value) {
    throw new Error('usePostCreator must be used within PostCreatorProvider')
  }
  return value
}
