import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  transpilePackages: ['mathml2omml', 'pptxgenjs'],
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    '@remotion/cli',
    '@remotion/player',
    'remotion',
  ],
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
};

export default nextConfig;
