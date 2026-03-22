import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  /** Raíz del monorepo para que standalone tracee `packages/shared`. */
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@pickandsurvive/shared'],
  experimental: {
    // Enable server actions (stable in Next.js 15)
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

export default nextConfig;
