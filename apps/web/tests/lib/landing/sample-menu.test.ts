import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getLandingSampleMenu', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns null when slug env is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_LANDING_SAMPLE_MENU_SLUG', '')
    const { getLandingSampleMenu } = await import('@/lib/landing/sample-menu')
    expect(getLandingSampleMenu()).toBeNull()
  })

  it('builds path and absolute URL from slug', async () => {
    vi.stubEnv('NEXT_PUBLIC_LANDING_SAMPLE_MENU_SLUG', 'demo-kitchen')
    const { getLandingSampleMenu, LANDING_SITE_URL } = await import('@/lib/landing/sample-menu')
    expect(getLandingSampleMenu()).toEqual({
      path: '/m/demo-kitchen',
      absoluteUrl: `${LANDING_SITE_URL}/m/demo-kitchen`,
    })
  })
})
