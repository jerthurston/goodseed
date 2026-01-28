import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';
import { transformPrismaToFaqContent } from '@/lib/transfomers/content-page/faq-content.transformer';
import { NextRequest, NextResponse } from 'next/server';
import { generateETag, shouldReturnNotModified, getCacheHeaders } from '@/lib/cache-headers';

/**
 * GET /api/content/faq
 * Fetch published FAQ content for public display
 * No authentication required
 * 
 * Cache Strategy:
 * - Browser: 5 min fresh, 1 hour stale-while-revalidate
 * - CDN: 30 min fresh
 * - ETag + 304 Not Modified support
 * - CF-Cache-Tag: content,faq (for invalidation)
 */
export async function GET(req: NextRequest) {
  try {
    apiLogger.debug('Fetching published FAQ content');

    // 1️⃣ Fetch published settings
    const settings = await prisma.faqPageSettings.findFirst({
      where: { isPublished: true },
    });

    // 2️⃣ If no settings or not published, return default
    if (!settings) {
      apiLogger.info('No published FAQ settings found, returning default');
      
      const defaultContent = {
        settings: {
          title: 'Frequently Asked Questions',
          description: 'Find answers to the most common questions about our services.',
          noAnswerMessage: "Can't find the answer you're looking for?",
          contactLabel: 'Contact Us',
          contactHref: '/contact',
          isPublished: true,
        },
        categories: [],
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
            'CF-Cache-Tag': 'content,faq'
          }
        });
      }

      return NextResponse.json(defaultContent, {
        status: 200,
        headers: {
          ...getCacheHeaders('content'),
          'ETag': etag,
          'CF-Cache-Tag': 'content,faq',
          'Vary': 'Accept-Encoding'
        }
      });
    }

    // 3️⃣ Fetch visible categories with visible FAQs
    const categories = await prisma.faqCategory.findMany({
      where: { isVisible: true },
      include: {
        faqs: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // 4️⃣ Transform to nested structure
    const content = transformPrismaToFaqContent(settings, categories);

    // 5️⃣ Generate ETag from plain data
    const etag = generateETag(content);

    // 6️⃣ Check if client has fresh cache (304 Not Modified)
    if (shouldReturnNotModified(req, etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': getCacheHeaders('content')['Cache-Control'],
          'CF-Cache-Tag': 'content,faq'
        }
      });
    }

    // 7️⃣ Return full response with cache headers
    apiLogger.info('FAQ content fetched successfully', {
      categoriesCount: categories.length,
      totalFaqs: categories.reduce((sum, cat) => sum + cat.faqs.length, 0),
    });

    const response = NextResponse.json(content, { status: 200 });

    // Apply cache headers (5 min browser, 30 min CDN, 1 hour SWR)
    const cacheHeaders = getCacheHeaders('content');
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // ETag for conditional requests
    response.headers.set('ETag', etag);

    // Last-Modified (use actual data timestamp)
    response.headers.set('Last-Modified', settings.updatedAt.toUTCString());

    // Cloudflare cache tags for targeted purge
    response.headers.set('CF-Cache-Tag', 'content,faq');

    // Vary for content negotiation
    response.headers.set('Vary', 'Accept-Encoding');

    return response;
  } catch (error) {
    apiLogger.logError('Error fetching FAQ content:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQ content' },
      { status: 500 }
    );
  }
}
