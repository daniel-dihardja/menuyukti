import { describe, expect, it } from 'vitest'

import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import { resolveGenerationReferences } from '@/lib/posts/resolve-generation-references'

const USER_ID = 'user_test_123'
const PREVIEW_KEY = `users/${USER_ID}/posts/11111111-1111-1111-1111-111111111111.webp`

function photo(name: string, enabled = true): PostCreatorReferenceImage {
  return { name, url: `https://example.com/${name}`, enabled }
}

describe('resolveGenerationReferences', () => {
  it('returns filled-edit mode when preview has a generated image and no photos', () => {
    const { mode, references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp', false)],
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(mode).toBe('filled-edit')
    expect(references).toEqual([
      {
        type: 'previous-result',
        filename: '11111111-1111-1111-1111-111111111111.webp',
      },
    ])
  })

  it('returns fresh-scene with previous and photos when preview has a generated image', () => {
    const { mode, references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp'), photo('b.webp', false), photo('c.webp')],
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(mode).toBe('fresh-scene')
    expect(references).toEqual([
      {
        type: 'previous-result',
        filename: '11111111-1111-1111-1111-111111111111.webp',
      },
      { type: 'photo', name: 'a.webp' },
      { type: 'photo', name: 'c.webp' },
    ])
  })

  it('returns fresh-scene with photos only when preview has no generated image', () => {
    const { mode, references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp'), photo('b.webp', false), photo('c.webp')],
      previewMediaS3Key: null,
    })

    expect(mode).toBe('fresh-scene')
    expect(references).toEqual([
      { type: 'photo', name: 'a.webp' },
      { type: 'photo', name: 'c.webp' },
    ])
  })

  it('returns empty when nothing is selected', () => {
    const { mode, references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp', false)],
      previewMediaS3Key: null,
    })

    expect(mode).toBe('fresh-scene')
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
        photo('7.webp'),
      ],
      previewMediaS3Key: null,
    })

    expect(references).toHaveLength(7)
    expect(tooManyReferences).toBe(true)
  })

  it('reserves a slot for style when styleSelected is true', () => {
    const { references, tooManyReferences } = resolveGenerationReferences({
      referenceImages: [
        photo('1.webp'),
        photo('2.webp'),
        photo('3.webp'),
        photo('4.webp'),
        photo('5.webp'),
        photo('6.webp'),
      ],
      previewMediaS3Key: null,
      styleSelected: true,
    })

    expect(references).toHaveLength(6)
    expect(tooManyReferences).toBe(true)
  })

  it('allows max client refs when style is not selected', () => {
    const { tooManyReferences } = resolveGenerationReferences({
      referenceImages: [
        photo('1.webp'),
        photo('2.webp'),
        photo('3.webp'),
        photo('4.webp'),
        photo('5.webp'),
        photo('6.webp'),
      ],
      previewMediaS3Key: null,
      styleSelected: false,
    })

    expect(tooManyReferences).toBe(false)
  })

  it('prepends solid background when enabled and no previous result', () => {
    const { mode, references, tooManyReferences } = resolveGenerationReferences({
      referenceImages: [photo('a.webp')],
      previewMediaS3Key: null,
      solidBackgroundEnabled: true,
      solidBackgroundColor: '#F0F0F0',
    })

    expect(mode).toBe('fresh-scene')
    expect(tooManyReferences).toBe(false)
    expect(references).toEqual([
      { type: 'background-color', color: '#f0f0f0' },
      { type: 'photo', name: 'a.webp' },
    ])
  })

  it('injects solid background alone when enabled with no photos', () => {
    const { references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp', false)],
      previewMediaS3Key: null,
      solidBackgroundEnabled: true,
      solidBackgroundColor: '#ffffff',
    })

    expect(references).toEqual([{ type: 'background-color', color: '#ffffff' }])
  })

  it('omits solid background when disabled', () => {
    const { references } = resolveGenerationReferences({
      referenceImages: [photo('a.webp')],
      previewMediaS3Key: null,
      solidBackgroundEnabled: false,
      solidBackgroundColor: '#ffffff',
    })

    expect(references).toEqual([{ type: 'photo', name: 'a.webp' }])
  })

  it('omits solid background when a previous result is attached', () => {
    const { references } = resolveGenerationReferences({
      referenceImages: [],
      previewMediaS3Key: PREVIEW_KEY,
      solidBackgroundEnabled: true,
      solidBackgroundColor: '#ffffff',
    })

    expect(references).toEqual([
      {
        type: 'previous-result',
        filename: '11111111-1111-1111-1111-111111111111.webp',
      },
    ])
  })

  it('counts solid background toward the generation limit with style reserved', () => {
    const { references, tooManyReferences } = resolveGenerationReferences({
      referenceImages: [
        photo('1.webp'),
        photo('2.webp'),
        photo('3.webp'),
        photo('4.webp'),
        photo('5.webp'),
      ],
      previewMediaS3Key: null,
      styleSelected: true,
      solidBackgroundEnabled: true,
      solidBackgroundColor: '#ffffff',
    })

    expect(references).toHaveLength(6)
    expect(references[0]).toEqual({ type: 'background-color', color: '#ffffff' })
    expect(tooManyReferences).toBe(true)
  })
})
