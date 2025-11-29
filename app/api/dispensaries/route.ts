import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const dispensaries = await prisma.dispensary.findMany({
            where: {
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return NextResponse.json({
            dispensaries,
            total: dispensaries.length,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching dispensaries:', errorMessage);
        return NextResponse.json(
            { error: 'Failed to fetch dispensaries', details: errorMessage },
            { status: 500 }
        );
    }
}
