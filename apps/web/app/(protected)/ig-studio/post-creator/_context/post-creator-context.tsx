'use client'

import { createContext } from 'react'

import type { PostCreatorContextValue } from './types'

export const PostCreatorContext = createContext<PostCreatorContextValue | null>(null)
