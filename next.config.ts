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

  // Phase 3: Static Files Caching
  // Cache headers for files in /public folder
  async headers() {
    return [
      // 1️⃣ IMAGES từ /public/images/*
      // Ví dụ: /public/images/logo.png → http://yoursite.com/images/logo.png
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, immutable' // 30 days
            // immutable = nội dung không đổi, browser không cần revalidate
          }
        ]
      },

      // 2️⃣ FONTS từ /public/fonts/*
      // Ví dụ: /public/fonts/inter.woff2 → http://yoursite.com/fonts/inter.woff2
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable' // 1 year
            // Font files hầu như không đổi → cache cực mạnh
          }
        ]
      },

      // 3️⃣ FAVICON
      // File: /public/favicon.ico → http://yoursite.com/favicon.ico
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400' // 1 day
            // Favicon có thể đổi khi rebrand → không dùng immutable
          }
        ]
      },

      // 4️⃣ Next.js BUILD OUTPUT (/_next/static/*)
      // Next.js đã tự động cache, nhưng explicit để rõ ràng
      // Ví dụ: /_next/static/chunks/main-abc123.js
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
            // Build files có hash trong tên → cache vĩnh viễn OK
          }
        ]
      },

      // 5️⃣ SECURITY HEADERS (áp dụng cho TẤT CẢ routes)
      // Không liên quan đến cache nhưng là best practice
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on' // Cho phép browser prefetch DNS
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN' // Chống clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Chống MIME sniffing
          }
        ]
      }
    ];
  }
};

export default nextConfig;
