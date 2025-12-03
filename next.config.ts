import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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


    ],
  },
};

export default nextConfig;
