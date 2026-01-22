import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker/Production only
  // Set ENABLE_STANDALONE=true when building for Docker
  // This avoids Windows symlink permission issues in development
  ...(process.env.ENABLE_STANDALONE === 'true' && { output: 'standalone' }),
  
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
        hostname: 'beaverseed.com',
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
        hostname: 'maryjanesgarden.com',
        pathname: '/**',
      },
      {
       protocol: 'https',
       hostname: 'www.mjseedscanada.ca',
       pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rocketseeds.com',
        pathname: '/**',
      },
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
        hostname: 'beaverseed.com',
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
        hostname: 'maryjanesgarden.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.mjseedscanada.ca',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rocketseeds.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.cropkingseeds.ca',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.canukseeds.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.truenorthseedbank.com',
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
