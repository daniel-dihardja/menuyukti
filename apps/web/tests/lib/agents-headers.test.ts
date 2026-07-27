import { afterEach, describe, expect, it } from 'vitest'

import { buildAgentsHeaders } from '@/lib/agents/headers'

describe('buildAgentsHeaders', () => {
  const originalKey = process.env.GRAPHQL_INTERNAL_API_KEY
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GRAPHQL_INTERNAL_API_KEY
    } else {
      process.env.GRAPHQL_INTERNAL_API_KEY = originalKey
    }
    process.env.NODE_ENV = originalNodeEnv
  })

  it('includes user id and content-type', () => {
    delete process.env.GRAPHQL_INTERNAL_API_KEY
    process.env.NODE_ENV = 'development'
    const headers = buildAgentsHeaders('user_123')
    expect(headers['X-Menuyukti-User-Id']).toBe('user_123')
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['X-Internal-Api-Key']).toBeUndefined()
  })

  it('adds X-Internal-Api-Key when GRAPHQL_INTERNAL_API_KEY is set', () => {
    process.env.GRAPHQL_INTERNAL_API_KEY = 'secret-key'
    process.env.NODE_ENV = 'development'
    const headers = buildAgentsHeaders('user_123', { traceparent: 'tp' })
    expect(headers['X-Internal-Api-Key']).toBe('secret-key')
    expect(headers.traceparent).toBe('tp')
  })

  it('throws in production when key is missing', () => {
    delete process.env.GRAPHQL_INTERNAL_API_KEY
    process.env.NODE_ENV = 'production'
    expect(() => buildAgentsHeaders('user_123')).toThrow(
      'GRAPHQL_INTERNAL_API_KEY must be set in production',
    )
  })
})
