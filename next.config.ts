import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // xlsx needs this to work in Next.js edge runtime workaround
  serverExternalPackages: [],
}

export default nextConfig
