import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LEONARDO_POST_MODEL,
  LEONARDO_POST_MODEL_IDS,
  getLeonardoPostModelMessageKey,
} from '@/lib/posts/leonardo-post-models'

/**
 * Keeps LeonardoPostModelSelect option keys aligned with postCreator.prompt.model.options.
 */
describe('LeonardoPostModelSelect option keys', () => {
  it('defaults to flash Nano Banana', () => {
    expect(DEFAULT_LEONARDO_POST_MODEL).toBe('gemini-2.5-flash-image')
    expect(getLeonardoPostModelMessageKey(DEFAULT_LEONARDO_POST_MODEL)).toBe('flash')
  })

  it('maps every allowlisted model to a postCreator message key', () => {
    const keys = LEONARDO_POST_MODEL_IDS.map((id) => getLeonardoPostModelMessageKey(id))
    expect(keys).toEqual(['flash', 'nanoBanana2', 'pro'])
  })
})
