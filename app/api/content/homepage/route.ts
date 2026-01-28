import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transformPrismaToHomepageContent } from '@/lib/transfomers/content-page/homepage-content.transformer';
import { apiLogger } from '@/lib/helpers/api-logger';
import { generateETag, shouldReturnNotModified, getCacheHeaders } from '@/lib/cache-headers';

/**
 * GET /api/content/homepage
 * Public endpoint to fetch published homepage content
 * 
 * Cache Strategy:
 * - Browser: 5 min fresh, 1 hour stale-while-revalidate
 * - CDN: 30 min fresh
 * - ETag + 304 Not Modified support
 * - CF-Cache-Tag: content,homepage (for invalidation)
 */
export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Fetch published homepage content
    const homepageContent = await prisma.homepageContent.findFirst({
      where: { isPublished: true },
      orderBy: { updatedAt: 'desc' },
    });

    // 2️⃣ If no content exists, return default content
    if (!homepageContent) {
      apiLogger.warn('No published homepage content found, returning defaults');
      
      const defaultContent = {
        hero: {
          title: 'Find the best cannabis seeds at the best price',
          description: 'Search top seed banks, compare strains, and find the best prices.',
        },
        howItWorks: {
          title: 'How It Works',
          description: 'Getting the perfect seeds for your next grow has never been easier',
          steps: [
            { title: 'Search', description: 'Find the exact seeds you\'re looking for with our powerful search tools and filters.' },
            { title: 'Compare', description: 'Compare prices from trusted vendors side by side to help you find the best deal.' },
            { title: 'Grow', description: 'Purchase with confidence and start your perfect grow today.' },
          ],
        },
        features: {
          title: 'Why Choose goodseed',
          description: 'We make it easy to find and compare plant seeds from multiple trusted sources',
          features: [
            { icon: 'faSearchDollar', title: 'Compare Prices', description: 'See prices from sellers side by side to find the best deals on the seeds you want.' },
            { icon: 'faShieldAlt', title: 'Trusted Sources', description: 'We link only to trusted seed banks, so you can shop with confidence.' },
            { icon: 'faHeart', title: 'Save Favorites', description: 'Create an account to save your favorite seeds and get notified when prices drop.' },
          ],
        },
        cta: {
          title: 'Ready to Start Your next grow?',
          description: 'Join thousands of happy growers who found their perfect seeds with goodseed',
          ctaLabel: 'Browse Seeds Now',
          ctaHref: '/seeds',
        },
      };

      // Generate ETag for default content
      const etag = generateETag(defaultContent);

      // Check 304 Not Modified
      if (shouldReturnNotModified(req, etag)) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            'ETag': etag,
            'Cache-Control': getCacheHeaders('content')['Cache-Control'],
            'CF-Cache-Tag': 'content,homepage'
          }
        });
      }

      return NextResponse.json(defaultContent, {
        status: 200,
        headers: {
          ...getCacheHeaders('content'),
          'ETag': etag,
          'CF-Cache-Tag': 'content,homepage',
          'Vary': 'Accept-Encoding'
        }
      });
    }

    // 3️⃣ Transform flat Prisma data to nested structure
    const transformedData = transformPrismaToHomepageContent(homepageContent);

    // 4️⃣ Generate ETag from plain data (not Response object!)
    const etag = generateETag(transformedData);

    // 5️⃣ Check if client has fresh cache (304 Not Modified)
    if (shouldReturnNotModified(req, etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': getCacheHeaders('content')['Cache-Control'],
          'CF-Cache-Tag': 'content,homepage'
        }
      });
    }

    // 6️⃣ Return full response with cache headers
    apiLogger.debug('Homepage content served', { contentId: homepageContent.id });

    const response = NextResponse.json(transformedData, { status: 200 });

    // Apply cache headers (5 min browser, 30 min CDN, 1 hour SWR)
    const cacheHeaders = getCacheHeaders('content');
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // ETag for conditional requests
    response.headers.set('ETag', etag);

    // Last-Modified (use actual data timestamp)
    response.headers.set('Last-Modified', homepageContent.updatedAt.toUTCString());

    // Cloudflare cache tags for targeted purge
    response.headers.set('CF-Cache-Tag', 'content,homepage');

    // Vary for content negotiation
    response.headers.set('Vary', 'Accept-Encoding');

    return response;
  } catch (error) {
    apiLogger.logError('GET /api/content/homepage error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage content' },
      { status: 500 }
    );
  }
}
