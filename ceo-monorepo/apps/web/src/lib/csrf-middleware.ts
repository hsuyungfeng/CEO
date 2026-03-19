import { NextRequest, NextResponse } from 'next/server';
import { enhancedCSRFProtection } from '@/lib/csrf-protection-enhanced';
import { auditLogger } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';

/**
 * CSRF middleware for state-changing requests
 * Validates CSRF tokens on POST, PUT, DELETE, PATCH requests
 */
export async function validateCSRFToken(request: NextRequest) {
  // 🔓 開發模式：跳過 CSRF 驗證
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

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
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    
    logger.warn(
      { pathname, hasToken: !!token, hasSession: !!sessionId },
      'CSRF 令牌或會話 ID 缺失'
    );

    // 記錄審計日誌
    auditLogger.csrfFailure(sessionId || 'unknown', pathname, ip || undefined);

    return NextResponse.json(
      {
        error: '缺少 CSRF 令牌',
        code: 'CSRF_TOKEN_MISSING',
      },
      { status: 403 }
    );
  }

  // Verify CSRF token
  if (!enhancedCSRFProtection) {
    logger.error('CSRF 保護未初始化，請檢查 CSRF_SECRET 環境變數');
    return NextResponse.json(
      {
        error: '伺服器配置錯誤',
        code: 'CSRF_CONFIG_ERROR',
      },
      { status: 500 }
    );
  }
  
  const isValid = await enhancedCSRFProtection.verifyCSRFToken(sessionId, token);

  if (!isValid) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    
    logger.warn(
      { pathname, sessionId: sessionId.substring(0, 8) },
      'CSRF 令牌驗證失敗'
    );

    // 記錄審計日誌
    auditLogger.csrfFailure(sessionId, pathname, ip || undefined);

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
export async function generateCSRFToken(sessionId: string): Promise<string> {
  if (!enhancedCSRFProtection) {
    throw new Error('CSRF 保護未初始化，請檢查 CSRF_SECRET 環境變數');
  }
  
  const token = await enhancedCSRFProtection.generateCSRFToken(sessionId);
  return token;
}

/**
 * Add CSRF token to response cookies
 */
export async function addCSRFTokenToResponse(
  response: NextResponse,
  sessionId: string
): Promise<NextResponse> {
  const token = await generateCSRFToken(sessionId);

  response.cookies.set('x-csrf-token', token, {
    httpOnly: false, // Allow JavaScript access for AJAX requests
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  });

  return response;
}
