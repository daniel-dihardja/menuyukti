/** @type {import('next').NextConfig} */
import bundleAnalyzer from '@next/bundle-analyzer'
import createNextIntlPlugin from 'next-intl/plugin'
import withSerwistInit from '@serwist/next'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
  register: false,
  cacheOnNavigation: false,
})

const nextConfig = {
  cacheComponents: true,
  output: 'standalone',
  transpilePackages: ['@workspace/ui'],
  async redirects() {
    return [
      { source: '/agent', destination: '/advisor', permanent: true },
      { source: '/agent/:path*', destination: '/advisor/:path*', permanent: true },
      { source: '/workflow', destination: '/advisor', permanent: false },
      { source: '/workflow/:path*', destination: '/advisor', permanent: false },
      { source: '/campaigns', destination: '/advisor', permanent: true },
      { source: '/campaigns/:path*', destination: '/advisor', permanent: true },
      { source: '/workflows', destination: '/advisor', permanent: true },
      { source: '/content/photos', destination: '/media', permanent: true },
      { source: '/content/photos/:path*', destination: '/media/:path*', permanent: true },
      { source: '/api/photos/:path*', destination: '/api/media/:path*', permanent: true },
      { source: '/posts', destination: '/ig-studio', permanent: true },
      { source: '/posts/:path*', destination: '/ig-studio/:path*', permanent: true },
      { source: '/canvas/post-creator', destination: '/ig-studio/post-creator', permanent: true },
      { source: '/canvas/post-creator/:path*', destination: '/ig-studio/post-creator/:path*', permanent: true },
      { source: '/canvas', destination: '/ig-studio', permanent: true },
      { source: '/canvas/:path*', destination: '/ig-studio', permanent: true },
    ]
  },
  async rewrites() {
    return [
      { source: '/advisor', destination: '/agent' },
      { source: '/advisor/:path*', destination: '/agent/:path*' },
    ]
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@workspace/ui',
      '@ai-sdk/react',
      'react-markdown',
      'remark-gfm',
      'streamdown',
      '@streamdown/cjk',
      '@streamdown/code',
      '@streamdown/math',
      'motion',
      'date-fns',
    ],
    // Reel video uploads (up to 50 MB) pass through Clerk proxy; default buffer is 10 MB.
    proxyClientMaxBodySize: '52mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.clerk.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(withBundleAnalyzer(withSerwist(nextConfig)))
