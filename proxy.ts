import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// ============================================
// ROUTE CONFIGURATION
// ============================================

/**
 * Auth routes - redirect to dashboard if already logged in
 */
const authRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/error",
];

/**
 * Public API endpoints - accessible without authentication (GET only)
 */
const publicApiEntities = [
    "/api/seed",       // Product data
    "/api/content",    // CMS content
    "/api/health",     // Health checks
];

/**
 * Protected API endpoints requiring authentication
 */
const protectedApiPatterns = [
    "/api/me",         // User profile
    "/api/wishlist",   // User wishlist
];

/**
 * Admin-only API endpoints
 */
const adminApiPatterns = [
    "/api/admin",      // Admin operations
    "/api/cron",       // Cron jobs (should also check secret)
];

/**
 * Admin-only page routes
 */
const adminRoutes = [
    "/dashboard/admin",
    "/admin",
];

// ============================================
// PROXY FUNCTION
// ============================================

/**
 * Next.js 16 Proxy (formerly middleware)
 * Handles request routing, authentication, and access control
 */
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // ============================================
    // 1. PUBLIC API ENDPOINTS (GET only)
    // ============================================
    if (
        request.method === "GET" && 
        publicApiEntities.some((api) => pathname === api || pathname.startsWith(api + "/"))
    ) {
        return NextResponse.next();
    }

    // ============================================
    // 2. PROTECTED API ENDPOINTS
    // ============================================
    if (protectedApiPatterns.some((pattern) => pathname.startsWith(pattern))) {
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: "Authentication required" },
                { status: 401 }
            );
        }
        
        return NextResponse.next();
    }

    // ============================================
    // 3. ADMIN API ENDPOINTS
    // ============================================
    if (adminApiPatterns.some((pattern) => pathname.startsWith(pattern))) {
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: "Authentication required" },
                { status: 401 }
            );
        }

        // Check admin role
        if (session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, message: "Admin access required" },
                { status: 403 }
            );
        }
        
        return NextResponse.next();
    }

    // ============================================
    // 4. ADMIN PAGE ROUTES
    // ============================================
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
        const session = await auth();
        
        if (!session?.user) {
            const url = request.nextUrl.clone();
            url.pathname = "/auth/login";
            url.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(url);
        }

        if (session.user.role !== 'ADMIN') {
            // Redirect non-admin users to home
            return NextResponse.redirect(new URL("/", request.url));
        }
        
        return NextResponse.next();
    }

    // ============================================
    // 5. AUTH ROUTES (redirect if logged in)
    // ============================================
    if (authRoutes.includes(pathname)) {
        const session = await auth();
        
        if (session?.user) {
            // Redirect to dashboard if already logged in
            const redirectUrl = session.user.role === 'ADMIN' 
                ? "/dashboard/admin"
                : "/dashboard";
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        }
        
        return NextResponse.next();
    }

    // ============================================
    // 6. DASHBOARD ROUTES (require authentication)
    // ============================================
    if (pathname.startsWith("/dashboard")) {
        const session = await auth();
        
        if (!session?.user) {
            const url = request.nextUrl.clone();
            url.pathname = "/auth/login";
            url.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(url);
        }
        
        return NextResponse.next();
    }

    // ============================================
    // 7. DEFAULT - Allow all other routes (public pages)
    // ============================================
    // All pages are public by default unless explicitly protected above
    // This includes: /, /contact, /faq, /seeds/*, /partners/*, etc.
    return NextResponse.next();
}

/**
 * Configure middleware to only run on specific paths
 * Exclude static files and assets to improve performance
 */
export const config = {
  matcher: [
    // Catch all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|public|assets|.*\\..*).*)",
    // Explicitly include API routes
    "/api/:path*",
    // Explicitly include dashboard routes
    "/dashboard/:path*",
    "/admin/:path*"
  ],
};