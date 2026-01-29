import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { contactSubmissionSchema } from '@/schemas/contact-submission.schema';
import { apiLogger } from '@/lib/helpers/api-logger';

/**
 * POST /api/contact-submission
 * Create a new contact form submission
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();

    // Validate input with Zod
    const validatedData = contactSubmissionSchema.parse(body);

    // Get client info for tracking
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create contact submission
    const submission = await prisma.contactSubmission.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        category: validatedData.category,
        message: validatedData.message,
        ipAddress,
        userAgent,
        status: 'new',
      },
    });

    apiLogger.info('[ContactSubmission] New submission created', {
      submissionId: submission.id,
      email: submission.email,
      category: submission.category,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
        data: {
          id: submission.id,
          createdAt: submission.createdAt,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      apiLogger.logError('[ContactSubmission]', error, {
        type: 'validation_error',
        issues: error.issues,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    // Database or other errors
    apiLogger.logError('[ContactSubmission]', error instanceof Error ? error : new Error('Unknown error'));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to submit your message. Please try again later.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contact-submission
 * Admin endpoint to list submissions (optional - for future admin panel)
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin users
    // const session = await auth();
    // if (session?.user?.role !== 'ADMIN') {
    //   return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    // }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;

    const where = status ? { status } : {};

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    apiLogger.logError('[ContactSubmission]', error instanceof Error ? error : new Error('Unknown error'));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch submissions',
      },
      { status: 500 }
    );
  }
}
