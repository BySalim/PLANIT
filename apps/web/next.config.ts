import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages shipped as TypeScript source must be transpiled by Next.
  transpilePackages: ['@planit/ui', '@planit/design-tokens', '@planit/contracts', '@planit/utils'],
};

export default nextConfig;
