import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { HomepageContentSchema } from '@/schemas/content-page.schema';
import { 
  transformHomepageContentToPrisma, 
  transformPrismaToHomepageContent 
} from '@/lib/transfomers/content-page/homepage-content.transformer';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * GET /api/admin/cms/homepage
 * Lấy homepage content hiện tại
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      apiLogger.warn('Unauthorized CMS access attempt');
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Lấy homepage content (lấy record đầu tiên hoặc tạo mới nếu chưa có)
    let homepageContent = await prisma.homepageContent.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // Nếu chưa có data, tạo default
    if (!homepageContent) {
      homepageContent = await prisma.homepageContent.create({
        data: {
          heroTitle: 'Find the best cannabis seeds at the best price',
          heroDescription: 'Search top seed banks, compare strains, and find the best prices.',
          howItWorksTitle: 'How It Works',
          howItWorksDescription: 'Getting the perfect seeds for your next grow has never been easier',
          howItWorksSteps: [
            { title: 'Search', description: 'Find the exact seeds you\'re looking for with our powerful search tools and filters.' },
            { title: 'Compare', description: 'Compare prices from trusted vendors side by side to help you find the best deal.' },
            { title: 'Grow', description: 'Purchase with confidence and start your perfect grow today.' },
          ],
          featuresTitle: 'Why Choose goodseed',
          featuresDescription: 'We make it easy to find and compare plant seeds from multiple trusted sources',
          features: [
            { icon: 'faSearchDollar', title: 'Compare Prices', description: 'See prices from sellers side by side to find the best deals on the seeds you want.' },
            { icon: 'faShieldAlt', title: 'Trusted Sources', description: 'We link only to trusted seed banks, so you can shop with confidence.' },
            { icon: 'faHeart', title: 'Save Favorites', description: 'Create an account to save your favorite seeds and get notified when prices drop.' },
          ],
          ctaTitle: 'Ready to Start Your next grow?',
          ctaDescription: 'Join thousands of happy growers who found their perfect seeds with goodseed',
          ctaLabel: 'Browse Seeds Now',
          ctaHref: '/seeds',
          isPublished: true,
          updatedBy: session.user.email || 'admin',
        },
      });
      apiLogger.info('Homepage content initialized with default values', { 
        createdBy: session.user.email 
      });
    }

    // Transform flat Prisma data sang nested structure cho form
    const transformedData = transformPrismaToHomepageContent(homepageContent);

    apiLogger.debug('Homepage content retrieved', { 
      user: session.user.email,
      contentId: homepageContent.id 
    });

    return NextResponse.json(transformedData, { status: 200 });
  } catch (error) {
    apiLogger.logError('GET /api/admin/cms/homepage error', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage content' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/cms/homepage
 * Cập nhật homepage content
 */
export async function PUT(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      apiLogger.warn('Unauthorized CMS access attempt');
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    apiLogger.debug('Homepage content update request', { 
      user: session.user.email,
      dataKeys: Object.keys(body)
    });

    // Validate với Zod schema
    const validation = HomepageContentSchema.safeParse(body);
    if (!validation.success) {
      const validationError = new Error('Homepage content validation failed');
      apiLogger.logError('Homepage content validation', validationError, { 
        errors: validation.error.format() 
      });
      return NextResponse.json(
        { 
          error: 'Invalid data format', 
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    // Transform nested structure sang flat Prisma structure
    const prismaData = transformHomepageContentToPrisma(validation.data);

    // Tìm homepage content hiện tại
    const existingContent = await prisma.homepageContent.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    let updatedContent;
    if (existingContent) {
      // Update existing
      updatedContent = await prisma.homepageContent.update({
        where: { id: existingContent.id },
        data: {
          ...prismaData,
          updatedBy: session.user.email || 'admin',
        },
      });
      apiLogger.info('Homepage content updated', { 
        id: existingContent.id, 
        updatedBy: session.user.email 
      });
    } else {
      // Create new
      updatedContent = await prisma.homepageContent.create({
        data: {
          ...prismaData,
          isPublished: true,
          updatedBy: session.user.email || 'admin',
        },
      });
      apiLogger.info('Homepage content created', { 
        id: updatedContent.id, 
        createdBy: session.user.email 
      });
    }

    // Transform lại sang nested structure để return
    const responseData = transformPrismaToHomepageContent(updatedContent);

    return NextResponse.json(
      { 
        message: 'Homepage content updated successfully', 
        data: responseData 
      },
      { status: 200 }
    );
  } catch (error) {
    apiLogger.logError('PUT /api/admin/cms/homepage error', error as Error);
    return NextResponse.json(
      { error: 'Failed to update homepage content' },
      { status: 500 }
    );
  }
}
