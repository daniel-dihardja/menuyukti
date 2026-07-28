import { afterEach, describe, expect, it } from 'vitest'

import { graphqlServiceOrigin } from '@/lib/mobile/graphql-origin'
import { mobileCorsAllowOrigins, resolveMobileCorsOrigin } from '@/lib/mobile/cors'

describe('graphqlServiceOrigin', () => {
  const prev = process.env.GRAPHQL_ENDPOINT

  afterEach(() => {
    if (prev === undefined) delete process.env.GRAPHQL_ENDPOINT
    else process.env.GRAPHQL_ENDPOINT = prev
  })

  it('strips path from GRAPHQL_ENDPOINT', () => {
    process.env.GRAPHQL_ENDPOINT = 'http://127.0.0.1:8000/graphql'
    expect(graphqlServiceOrigin()).toBe('http://127.0.0.1:8000')
  })

  it('throws when unset', () => {
    delete process.env.GRAPHQL_ENDPOINT
    expect(() => graphqlServiceOrigin()).toThrow(/GRAPHQL_ENDPOINT/)
  })
})

describe('mobile CORS origins', () => {
  const prev = process.env.MOBILE_CORS_ORIGINS

  afterEach(() => {
    if (prev === undefined) delete process.env.MOBILE_CORS_ORIGINS
    else process.env.MOBILE_CORS_ORIGINS = prev
  })

  it('defaults include Expo web localhost', () => {
    delete process.env.MOBILE_CORS_ORIGINS
    expect(mobileCorsAllowOrigins()).toContain('http://localhost:8081')
  })

  it('respects MOBILE_CORS_ORIGINS override', () => {
    process.env.MOBILE_CORS_ORIGINS = 'https://expo.example.com'
    expect(mobileCorsAllowOrigins()).toEqual(['https://expo.example.com'])
    expect(resolveMobileCorsOrigin('https://expo.example.com')).toBe('https://expo.example.com')
    expect(resolveMobileCorsOrigin('http://localhost:8081')).toBeNull()
  })
})
