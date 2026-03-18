import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS configuration
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  process.env.NEXTAUTH_URL || 'http://localhost:3000',
  process.env.MOBILE_APP_DOMAIN || '',
].filter(Boolean);

// Security headers configuration
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.app cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; img-src 'self' data: https: blob:; font-src 'self' data: cdn.jsdelivr.net; connect-src 'self' *.vercel.app api.resend.com wss:; frame-ancestors 'none'; form-action 'self'",
} as const;

/**
 * Handle CORS preflight requests
 */
function handleCORSPreflight(request: NextRequest, origin: string): NextResponse {
  const isOriginAllowed = ALLOWED_ORIGINS.includes(origin);

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': isOriginAllowed ? origin : '',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
      ...SECURITY_HEADERS,
    },
  });
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse, origin: string): NextResponse {
  const isOriginAllowed = ALLOWED_ORIGINS.includes(origin);

  // Add CORS headers
  if (isOriginAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Expose-Headers',
      'Content-Length, X-JSON-Response-Code'
    );
  }

  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Prevent caching of sensitive pages
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORSPreflight(request, origin);
  }

  // Continue to next middleware/handler
  const response = NextResponse.next();

  // Add security headers to response
  return addSecurityHeaders(response, origin);
}

/**
 * Configure middleware matcher
 * Apply middleware to all API routes
 */
export const config = {
  matcher: [
    '/api/:path*',
    '/auth/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
  ],
};
