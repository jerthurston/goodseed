import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Mark server-only packages as external for Turbopack
  serverExternalPackages: ['crawlee', 'cheerio', 'puppeteer', 'playwright', 'bull', '@prisma/client'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'seedsupreme.com',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'www.royalqueenseeds.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vancouverseedbank.ca',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.sunwestgenetics.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bcbuddepot.com',
        pathname: '/**',
      },
      // Add more common seed vendor domains
      {
        protocol: 'https',
        hostname: 'www.cropkingseeds.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cropkingseeds.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.leafly.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.sonomaseeds.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mjseedscanada.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.mjseedscanada.com',
        pathname: '/**',
      },
      // Add wildcard for common image CDNs
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },


    ],
  },
};

export default nextConfig;
