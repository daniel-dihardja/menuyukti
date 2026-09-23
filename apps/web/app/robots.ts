import type { MetadataRoute } from 'next'

import { CUSTOMER_AUTH_PREFIXES, OPERATOR_APP_SHELL_PREFIXES } from '@/lib/routes'

const baseUrl = 'https://menuyukti.com'

/** Auth and internal paths that should not be crawled (in addition to signed-in app paths). */
const EXTRA_DISALLOW = ['/login', '/sign-up', '/sso-callback', '/agent', '/api/'] as const

const SIGNED_IN_PREFIXES = [...OPERATOR_APP_SHELL_PREFIXES, ...CUSTOMER_AUTH_PREFIXES] as const

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    ...SIGNED_IN_PREFIXES.map((prefix) => `${prefix}/`),
    ...SIGNED_IN_PREFIXES,
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
