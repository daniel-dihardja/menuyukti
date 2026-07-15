import { describe, expect, it } from 'vitest'

import type { PostCreatorReferenceImage } from '@/app/(protected)/canvas/post-creator/_components/post-creator-thumbnails-pane'
import { resolveGenerationReferences } from '@/lib/posts/resolve-generation-references'

const USER_ID = 'user_test_123'
const PREVIEW_KEY = `users/${USER_ID}/posts/11111111-1111-1111-1111-111111111111.webp`

function photo(name: string, enabled = true): PostCreatorReferenceImage {
  return { name, url: `https://example.com/${name}`, enabled }
}

describe('resolveGenerationReferences', () => {
  it('puts previous result first when enabled and preview exists', () => {
    const { references, tooManyReferences } = resolveGenerationReferences({
      referenceImages: [photo('a.webp'), photo('b.webp')],
      usePreviousResult: true,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(tooManyReferences).toBe(false)
    expect(references).toEqual([
      { type: 'previous-result', filename: '11111111-1111-1111-1111-111111111111.webp' },
      { type: 'photo', name: 'a.webp' },
      { type: 'photo', name: 'b.webp' },
    ])
  })

  it('returns enabled photos only when previous result is off', () => {
    const { references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp'), photo('b.webp', false), photo('c.webp')],
      usePreviousResult: false,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(references).toEqual([
      { type: 'photo', name: 'a.webp' },
      { type: 'photo', name: 'c.webp' },
    ])
  })

  it('returns previous only when all photos are unchecked', () => {
    const { references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp', false)],
      usePreviousResult: true,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(references).toEqual([
      { type: 'previous-result', filename: '11111111-1111-1111-1111-111111111111.webp' },
    ])
  })

  it('returns empty when nothing is selected', () => {
    const { references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp', false)],
      usePreviousResult: false,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(references).toEqual([])
  })

  it('flags too many references when over the generation limit', () => {
    const { references, tooManyReferences } = resolveGenerationReferences({
      referenceImages: [
        photo('1.webp'),
        photo('2.webp'),
        photo('3.webp'),
        photo('4.webp'),
        photo('5.webp'),
        photo('6.webp'),
      ],
      usePreviousResult: true,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(references).toHaveLength(7)
    expect(tooManyReferences).toBe(true)
  })
})
