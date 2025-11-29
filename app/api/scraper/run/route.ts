import { runAllScrapers, runScraper } from '@/scrapers';
import { NextResponse } from 'next/server';

/**
 * API endpoint để trigger scraper manually
 * POST /api/scraper/run
 * Body: { scraper?: "leafly" | "all" }
 */
export async function POST(request: Request) {
    try {
        console.log('[API] Scraper request received');

        const body = await request.json();
        const scraperName = body.scraper || 'all';
        const startPage = body.startPage || 1;
        const endPage = body.endPage || 10;

        console.log(`[API] Running scraper: ${scraperName}, pages ${startPage}-${endPage}`);

        let message = '';
        if (scraperName === 'all') {
            await runAllScrapers();
            message = 'All scrapers completed successfully';
        } else {
            await runScraper(scraperName, startPage, endPage);
            message = `Scraper "${scraperName}" completed pages ${startPage}-${endPage} successfully`;
        }

        console.log('[API] Scraper completed successfully');

        return NextResponse.json({
            success: true,
            message,
        });
    } catch (error) {
        console.error('[API] Scraper error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[API] Error details:', errorMessage);

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}