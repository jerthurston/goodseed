import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'seedsupreme.com',
        pathname: '/media/**',
      },
    ],
  },
};

export default nextConfig;
