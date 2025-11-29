import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const dispensaryId = searchParams.get('dispensaryId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const type = searchParams.get('type');

        const where: any = {};

        if (dispensaryId) {
            where.dispensaryId = dispensaryId;
        }

        if (type) {
            where.type = type;
        }

        const products = await prisma.dispensaryProduct.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                dispensary: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
                strain: {
                    select: {
                        name: true,
                        slug: true,
                        type: true,
                    },
                },
            },
        });

        const total = await prisma.dispensaryProduct.count({ where });

        return NextResponse.json({
            products,
            total,
            showing: products.length,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching products:', errorMessage);
        return NextResponse.json(
            { error: 'Failed to fetch products', details: errorMessage },
            { status: 500 }
        );
    }
}
