import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@byewalls/config', '@byewalls/content-extraction'],
}

export default nextConfig
