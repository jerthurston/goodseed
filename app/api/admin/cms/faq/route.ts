import { auth } from '@/auth';
import { apiLogger } from '@/lib/helpers/api-logger';
import { prisma } from '@/lib/prisma';
import {
  transformFaqContentToPrisma,
  transformPrismaToFaqContent,
} from '@/lib/transfomers/content-page/faq-content.transformer';
import { FaqContentSchema } from '@/schemas/faq.schema';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/cms/faq
 * Fetch FAQ content for admin editing
 * Requires ADMIN authentication
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      apiLogger.warn('Unauthorized FAQ content fetch attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    apiLogger.debug('Fetching FAQ content for admin');

    // Fetch settings
    let settings = await prisma.faqPageSettings.findFirst();

    // Create default settings if none exist
    if (!settings) {
      apiLogger.info('No FAQ settings found, creating default');
      settings = await prisma.faqPageSettings.create({
        data: {
          title: 'Frequently Asked Questions',
          description: 'Find answers to the most common questions about our services.',
          noAnswerMessage: "Can't find the answer you're looking for?",
          contactLabel: 'Contact Us',
          contactHref: '/contact',
          isPublished: true,
          updatedBy: session.user.email || 'system',
        },
      });
    }

    // Fetch all categories with their FAQs
    const categories = await prisma.faqCategory.findMany({
      include: {
        faqs: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // If no categories exist, return default structure
    if (categories.length === 0) {
      apiLogger.info('No FAQ categories found, returning empty structure');
      return NextResponse.json({
        settings: {
          title: settings.title,
          description: settings.description,
          noAnswerMessage: settings.noAnswerMessage,
          contactLabel: settings.contactLabel,
          contactHref: settings.contactHref,
          isPublished: settings.isPublished,
        },
        categories: [],
      });
    }

    // Transform to nested structure
    const content = transformPrismaToFaqContent(settings, categories);

    apiLogger.info('FAQ content fetched successfully', {
      categoriesCount: categories.length,
      totalFaqs: categories.reduce((sum, cat) => sum + cat.faqs.length, 0),
    });

    return NextResponse.json(content);
  } catch (error) {
    apiLogger.logError('Error fetching FAQ content:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQ content' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/cms/faq
 * Update FAQ content from admin form
 * Requires ADMIN authentication
 */
export async function PUT(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      apiLogger.warn('Unauthorized FAQ content update attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = FaqContentSchema.safeParse(body);

    if (!validation.success) {
      apiLogger.warn('Invalid FAQ content data', { errors: validation.error.issues });
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    apiLogger.debug('Updating FAQ content', {
      categoriesCount: data.categories.length,
      totalFaqs: data.categories.reduce((sum, cat) => sum + cat.items.length, 0),
    });

    // Transform to Prisma format
    const prismaData = transformFaqContentToPrisma(data);

    // Use transaction to update everything atomically
    await prisma.$transaction(async (tx) => {
      // 1. Update or create settings
      await tx.faqPageSettings.upsert({
        where: { id: (await tx.faqPageSettings.findFirst())?.id || 'new' },
        create: {
          ...prismaData.settings,
          updatedBy: session.user.email || 'admin',
        },
        update: {
          ...prismaData.settings,
          updatedBy: session.user.email || 'admin',
        },
      });

      // 2. Get existing category and FAQ IDs
      const existingCategories = await tx.faqCategory.findMany({
        include: { faqs: true },
      });
      const existingCategoryIds = existingCategories.map((c) => c.id);
      const existingFaqIds = existingCategories.flatMap((c) =>
        c.faqs.map((f) => f.id)
      );

      // 3. Track incoming IDs
      const incomingCategoryIds = prismaData.categories
        .map((c) => c.id)
        .filter(Boolean) as string[];
      const incomingFaqIds = prismaData.categories
        .flatMap((c) => c.items.map((i) => i.id))
        .filter(Boolean) as string[];

      // 4. Delete removed FAQs
      const faqsToDelete = existingFaqIds.filter(
        (id) => !incomingFaqIds.includes(id)
      );
      if (faqsToDelete.length > 0) {
        await tx.faq.deleteMany({
          where: { id: { in: faqsToDelete } },
        });
        apiLogger.debug(`Deleted ${faqsToDelete.length} FAQs`);
      }

      // 5. Delete removed categories
      const categoriesToDelete = existingCategoryIds.filter(
        (id) => !incomingCategoryIds.includes(id)
      );
      if (categoriesToDelete.length > 0) {
        await tx.faqCategory.deleteMany({
          where: { id: { in: categoriesToDelete } },
        });
        apiLogger.debug(`Deleted ${categoriesToDelete.length} categories`);
      }

      // 6. Upsert categories and their FAQs
      for (const category of prismaData.categories) {
        const upsertedCategory = await tx.faqCategory.upsert({
          where: { id: category.id || 'new' },
          create: {
            name: category.name,
            icon: category.icon,
            order: category.order,
            isVisible: category.isVisible,
          },
          update: {
            name: category.name,
            icon: category.icon,
            order: category.order,
            isVisible: category.isVisible,
          },
        });

        // Upsert FAQs for this category
        for (const item of category.items) {
          await tx.faq.upsert({
            where: { id: item.id || 'new' },
            create: {
              question: item.question,
              answer: item.answer,
              order: item.order,
              isVisible: item.isVisible,
              categoryId: upsertedCategory.id,
            },
            update: {
              question: item.question,
              answer: item.answer,
              order: item.order,
              isVisible: item.isVisible,
              categoryId: upsertedCategory.id,
            },
          });
        }
      }
    });

    apiLogger.info('FAQ content updated successfully', {
      updatedBy: session.user.email,
      categoriesCount: data.categories.length,
      totalFaqs: data.categories.reduce((sum, cat) => sum + cat.items.length, 0),
    });

    return NextResponse.json({
      success: true,
      message: 'FAQ content updated successfully',
    });
  } catch (error) {
    apiLogger.logError('Error updating FAQ content:', error as Error);
    return NextResponse.json(
      { error: 'Failed to update FAQ content' },
      { status: 500 }
    );
  }
}
