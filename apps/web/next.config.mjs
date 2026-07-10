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
      { source: '/campaigns', destination: '/workflow', permanent: true },
      { source: '/campaigns/:path*', destination: '/workflow/:path*', permanent: true },
      { source: '/workflows', destination: '/workflow', permanent: true },
      { source: '/content/photos', destination: '/media', permanent: true },
      { source: '/content/photos/:path*', destination: '/media/:path*', permanent: true },
      { source: '/api/photos/:path*', destination: '/api/media/:path*', permanent: true },
    ]
  },
  async rewrites() {
    return [
      { source: '/advisor', destination: '/agent' },
      { source: '/advisor/:path*', destination: '/agent/:path*' },
    ]
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@workspace/ui', '@ai-sdk/react', 'react-markdown'],
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
}

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(withBundleAnalyzer(withSerwist(nextConfig)))
