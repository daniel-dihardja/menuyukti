import { describe, expect, it } from 'vitest'

import { mediaNamesToPhotoGenerationReferences } from '@/lib/chat/media-names-to-generation-references'

describe('mediaNamesToPhotoGenerationReferences', () => {
  it('maps filenames to photo generation references', () => {
    expect(
      mediaNamesToPhotoGenerationReferences([
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp',
        '11111111-2222-3333-4444-555555555555.png',
      ]),
    ).toEqual([
      { type: 'photo', name: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp' },
      { type: 'photo', name: '11111111-2222-3333-4444-555555555555.png' },
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(mediaNamesToPhotoGenerationReferences([])).toEqual([])
  })
})
