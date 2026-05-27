import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        // Produção: domínio do backend (configure NEXT_PUBLIC_API_URL para alterar)
        protocol: 'https',
        hostname: '**.railway.app',
        pathname: '/uploads/**',
      },
      {
        // CDN Cloudflare R2 / S3 (configurar quando migrar uploads)
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
