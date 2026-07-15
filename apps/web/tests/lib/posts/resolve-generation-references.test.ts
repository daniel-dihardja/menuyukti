import { describe, expect, it } from 'vitest'

import type { PostCreatorReferenceImage } from '@/lib/posts/post-creator-types'
import { resolveGenerationReferences } from '@/lib/posts/resolve-generation-references'

const USER_ID = 'user_test_123'
const PREVIEW_KEY = `users/${USER_ID}/posts/11111111-1111-1111-1111-111111111111.webp`

function photo(name: string, enabled = true): PostCreatorReferenceImage {
  return { name, url: `https://example.com/${name}`, enabled }
}

function template(name: string): PostCreatorReferenceImage {
  return { name, url: `https://example.com/media/${name}`, enabled: true }
}

describe('resolveGenerationReferences', () => {
  it('returns template-composite mode with template first then photos', () => {
    const { mode, references, tooManyReferences, hasTemplatePreviousConflict } =
      resolveGenerationReferences({
        templateImage: template('layout.webp'),
        referenceImages: [photo('a.webp'), photo('b.webp')],
        usePreviousResult: false,
        previewMediaS3Key: PREVIEW_KEY,
      })

    expect(mode).toBe('template-composite')
    expect(tooManyReferences).toBe(false)
    expect(hasTemplatePreviousConflict).toBe(false)
    expect(references).toEqual([
      { type: 'template', name: 'layout.webp' },
      { type: 'photo', name: 'a.webp' },
      { type: 'photo', name: 'b.webp' },
    ])
  })

  it('returns filled-edit mode with previous result only', () => {
    const { mode, references } = resolveGenerationReferences({
      templateImage: null,
      referenceImages: [photo('a.webp', false)],
      usePreviousResult: true,
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

  it('returns fresh-scene with previous and photos when no template', () => {
    const { mode, references } = resolveGenerationReferences({
      templateImage: null,
      referenceImages: [photo('a.webp'), photo('b.webp', false), photo('c.webp')],
      usePreviousResult: true,
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

  it('returns fresh-scene with photos only when previous result is off', () => {
    const { mode, references } = resolveGenerationReferences({
      templateImage: null,
      referenceImages: [photo('a.webp'), photo('b.webp', false), photo('c.webp')],
      usePreviousResult: false,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(mode).toBe('fresh-scene')
    expect(references).toEqual([
      { type: 'photo', name: 'a.webp' },
      { type: 'photo', name: 'c.webp' },
    ])
  })

  it('flags template and previous result conflict', () => {
    const { mode, hasTemplatePreviousConflict, references } = resolveGenerationReferences({
      templateImage: template('layout.webp'),
      referenceImages: [photo('a.webp')],
      usePreviousResult: true,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(hasTemplatePreviousConflict).toBe(true)
    expect(mode).toBe('template-composite')
    expect(references).toEqual([
      { type: 'template', name: 'layout.webp' },
      { type: 'photo', name: 'a.webp' },
    ])
  })

  it('returns empty when nothing is selected', () => {
    const { mode, references } = resolveGenerationReferences({
      templateImage: null,
      referenceImages: [photo('a.webp', false)],
      usePreviousResult: false,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(mode).toBe('fresh-scene')
    expect(references).toEqual([])
  })

  it('flags too many references when over the generation limit', () => {
    const { references, tooManyReferences } = resolveGenerationReferences({
      templateImage: template('layout.webp'),
      referenceImages: [
        photo('1.webp'),
        photo('2.webp'),
        photo('3.webp'),
        photo('4.webp'),
        photo('5.webp'),
        photo('6.webp'),
      ],
      usePreviousResult: false,
      previewMediaS3Key: PREVIEW_KEY,
    })

    expect(references).toHaveLength(7)
    expect(tooManyReferences).toBe(true)
  })
})
