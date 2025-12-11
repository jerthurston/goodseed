import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark Crawlee and its dependencies as external for server-side
  serverExternalPackages: ['crawlee', 'cheerio', 'puppeteer', 'playwright'],

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


    ],
  },
};

export default nextConfig;
