import { auth } from "@/auth/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/debug/session
 * Debug endpoint to check current session
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        return NextResponse.json({
            hasSession: !!session,
            session: session ? {
                user: session.user,
                expires: session.expires,
            } : null,
            headers: {
                cookie: request.headers.get('cookie')?.substring(0, 100) + '...', // First 100 chars
            }
        });
    } catch (error) {
        return NextResponse.json({
            error: 'Failed to get session',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
