import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transformPrismaToHomepageContent } from '@/lib/transfomers/content-page/homepage-content.transformer';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * GET /api/content/homepage
 * Public endpoint to fetch published homepage content
 */
export async function GET(req: NextRequest) {
  try {
    // Fetch published homepage content
    const homepageContent = await prisma.homepageContent.findFirst({
      where: { isPublished: true },
      orderBy: { updatedAt: 'desc' },
    });

    // If no content exists, return default content
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

      return NextResponse.json(defaultContent, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache 5 minutes
        }
      });
    }

    // Transform flat Prisma data to nested structure
    const transformedData = transformPrismaToHomepageContent(homepageContent);

    apiLogger.debug('Homepage content served', { contentId: homepageContent.id });

    return NextResponse.json(transformedData, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache 5 minutes
      }
    });
  } catch (error) {
    apiLogger.logError('GET /api/content/homepage error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage content' },
      { status: 500 }
    );
  }
}
