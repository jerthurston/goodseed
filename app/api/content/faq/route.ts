import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';
import { transformPrismaToFaqContent } from '@/lib/transfomers/content-page/faq-content.transformer';
import { NextResponse } from 'next/server';

/**
 * GET /api/content/faq
 * Fetch published FAQ content for public display
 * No authentication required
 */
export async function GET() {
  try {
    apiLogger.debug('Fetching published FAQ content');

    // Fetch published settings
    const settings = await prisma.faqPageSettings.findFirst({
      where: { isPublished: true },
    });

    // If no settings or not published, return default
    if (!settings) {
      apiLogger.info('No published FAQ settings found, returning default');
      return NextResponse.json(
        {
          settings: {
            title: 'Frequently Asked Questions',
            description: 'Find answers to the most common questions about our services.',
            noAnswerMessage: "Can't find the answer you're looking for?",
            contactLabel: 'Contact Us',
            contactHref: '/contact',
            isPublished: true,
          },
          categories: [],
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // Fetch visible categories with visible FAQs
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

    // Transform to nested structure
    const content = transformPrismaToFaqContent(settings, categories);

    apiLogger.info('FAQ content fetched successfully', {
      categoriesCount: categories.length,
      totalFaqs: categories.reduce((sum, cat) => sum + cat.faqs.length, 0),
    });

    return NextResponse.json(content, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    apiLogger.logError('Error fetching FAQ content:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQ content' },
      { status: 500 }
    );
  }
}
