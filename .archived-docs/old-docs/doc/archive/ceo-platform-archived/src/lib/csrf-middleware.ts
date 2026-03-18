import { NextRequest, NextResponse } from 'next/server';
import { csrfProtection } from '@/lib/csrf-protection';
import { logger } from '@/lib/logger';

/**
 * CSRF middleware for state-changing requests
 * Validates CSRF tokens on POST, PUT, DELETE, PATCH requests
 */
export async function validateCSRFToken(request: NextRequest) {
  // Only validate state-changing methods
  const method = request.method.toUpperCase();
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (!stateChangingMethods.includes(method)) {
    return null; // No validation needed for GET, OPTIONS, HEAD
  }

  // Skip CSRF validation for specific endpoints
  const pathname = new URL(request.url).pathname;
  const skipCSRFPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/health',
  ];

  if (skipCSRFPaths.some((path) => pathname.startsWith(path))) {
    return null; // Skip CSRF validation for auth endpoints
  }

  // Get CSRF token from header or body
  let token = request.headers.get('x-csrf-token');

  if (!token) {
    // Try to get from cookie (for form submissions)
    const csrfCookie = request.cookies.get('x-csrf-token')?.value;
    if (csrfCookie) {
      token = csrfCookie;
    }
  }

  // Get session ID from cookie
  const sessionId = request.cookies.get('sessionId')?.value;

  if (!token || !sessionId) {
    logger.warn(
      { pathname, hasToken: !!token, hasSession: !!sessionId },
      'CSRF 令牌或會話 ID 缺失'
    );

    return NextResponse.json(
      {
        error: '缺少 CSRF 令牌',
        code: 'CSRF_TOKEN_MISSING',
      },
      { status: 403 }
    );
  }

  // Verify CSRF token
  const isValid = csrfProtection.verifyToken(sessionId, token);

  if (!isValid) {
    logger.warn(
      { pathname, sessionId: sessionId.substring(0, 8) },
      'CSRF 令牌驗證失敗'
    );

    return NextResponse.json(
      {
        error: 'CSRF 令牌無效',
        code: 'CSRF_TOKEN_INVALID',
      },
      { status: 403 }
    );
  }

  // Token is valid, continue
  return null;
}

/**
 * Generate CSRF token for API endpoints
 */
export function generateCSRFToken(sessionId: string): string {
  return csrfProtection.generateToken(sessionId);
}

/**
 * Add CSRF token to response cookies
 */
export function addCSRFTokenToResponse(
  response: NextResponse,
  sessionId: string
): NextResponse {
  const token = generateCSRFToken(sessionId);

  response.cookies.set('x-csrf-token', token, {
    httpOnly: false, // Allow JavaScript access for AJAX requests
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  });

  return response;
}
