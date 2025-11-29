import { runProductScraper } from '@/scrapers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { dispensaryId, startPage = 1, endPage = 5 } = body;

        if (!dispensaryId) {
            return NextResponse.json(
                { error: 'Dispensary ID is required' },
                { status: 400 }
            );
        }

        // Validate page numbers
        if (startPage < 1 || endPage < startPage) {
            return NextResponse.json(
                { error: 'Invalid page range' },
                { status: 400 }
            );
        }

        // Run scraper
        await runProductScraper(dispensaryId, startPage, endPage);

        return NextResponse.json({
            success: true,
            message: `Product scraping completed for pages ${startPage}-${endPage}`,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Product scraper error:', errorMessage);
        return NextResponse.json(
            { error: 'Scraping failed', details: errorMessage },
            { status: 500 }
        );
    }
}
