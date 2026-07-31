import type { MetadataRoute } from 'next'

import { PROTECTED_APP_SHELL_PREFIXES } from '@/lib/routes'

const baseUrl = 'https://menuyukti.com'

/** Auth and internal paths that should not be crawled (in addition to protected app shell). */
const EXTRA_DISALLOW = ['/login', '/sign-up', '/sso-callback', '/agent', '/api/'] as const

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    ...PROTECTED_APP_SHELL_PREFIXES.map((prefix) => `${prefix}/`),
    ...PROTECTED_APP_SHELL_PREFIXES,
    ...EXTRA_DISALLOW,
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/shop', '/shop/', '/privacy', '/terms'],
        disallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
