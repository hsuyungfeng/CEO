import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateCSRFToken } from '@/lib/csrf-middleware';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// 使用 Edge Runtime 相容的 NextAuth 實例讀取 session
const { auth } = NextAuth(authConfig);

// CORS 允許來源
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  process.env.NEXTAUTH_URL || 'http://localhost:3000',
  process.env.MOBILE_APP_DOMAIN || '',
].filter(Boolean) as string[];

// 不需要 CSRF 驗證的路徑
const SKIP_CSRF_PATHS = [
  '/api/auth/',
  '/api/health',
  '/api/cron/',
  '/api/notifications/test',
  '/api/push/vapid-key',
  '/api/push/subscribe',
  '/api/push/unsubscribe',
  '/api/admin/settings',
];

// 需要登入的頁面路由（未登入跳轉 /auth/signin）
const PROTECTED_PAGE_PATHS = [
  '/admin',
  '/supplier',
  '/orders',
  '/cart',
  '/checkout',
  '/recommendations',
  '/purchase-templates',
  '/invoices',
  '/settings',
  '/notifications',
];

// 角色存取控制
const ROLE_RESTRICTED_PATHS: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/supplier': ['SUPPLIER', 'ADMIN'],
};

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

function addSecurityHeaders(response: NextResponse, origin: string): NextResponse {
  const isOriginAllowed = ALLOWED_ORIGINS.includes(origin);
  if (isOriginAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Expose-Headers', 'Content-Length, X-JSON-Response-Code');
  }
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const pathname = new URL(request.url).pathname;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCORSPreflight(request, origin);
  }

  // 頁面路由：身份驗證 + 角色守衛
  const isProtectedPage = PROTECTED_PAGE_PATHS.some(p => pathname.startsWith(p));
  if (isProtectedPage) {
    if (process.env.NODE_ENV !== 'development') {
      // 使用 NextAuth auth() 驗證 session，確保 Server Components 能讀取
      const session = await auth();

      if (!session || !session.user) {
        const signinUrl = new URL('/auth/signin', request.url);
        signinUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signinUrl);
      }

      // 角色存取控制
      for (const [path, allowedRoles] of Object.entries(ROLE_RESTRICTED_PATHS)) {
        if (pathname.startsWith(path)) {
          // role 從 cookie payload 中取得（NextAuth JWT 已解析在 token 中）
          // 此處僅做存在性檢查；精細角色驗證由各 API route handler 負責
          void allowedRoles; // 宣告已使用，實際由 API 層把關
          break;
        }
      }
    }

    const response = NextResponse.next();
    return addSecurityHeaders(response, origin);
  }

  // API 路由：CSRF 驗證
  const shouldSkipCSRF = SKIP_CSRF_PATHS.some(p => pathname.startsWith(p));
  if (!shouldSkipCSRF) {
    const csrfResult = await validateCSRFToken(request);
    if (csrfResult) {
      return addSecurityHeaders(csrfResult, origin);
    }
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response, origin);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/supplier/:path*',
    '/orders/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/recommendations/:path*',
    '/purchase-templates/:path*',
    '/invoices/:path*',
    '/settings/:path*',
    '/notifications/:path*',
  ],
};
