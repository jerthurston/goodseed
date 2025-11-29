import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const strains = await prisma.cannabisStrain.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 100,
            select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                thc: true,
                updatedAt: true,
            },
        });

        const stats = {
            total: await prisma.cannabisStrain.count(),
            byType: await prisma.cannabisStrain.groupBy({
                by: ['type'],
                _count: true,
            }),
        };

        return NextResponse.json({
            success: true,
            stats,
            strains,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
