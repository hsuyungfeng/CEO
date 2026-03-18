import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { decode } from 'next-auth/jwt';
import { findUserById, isUserActive } from '@/lib/prisma-auth';

/**
 * Unified authentication helper for CEO團購電商平台
 * 
 * This helper supports both authentication methods:
 * 1. Bearer Token (for Mobile App API)
 * 2. Session Cookies (for Web App)
 * 
 * Usage:
 * ```typescript
 * const authData = await getAuthData(request);
 * if (!authData) {
 *   return NextResponse.json({ error: '未授權' }, { status: 401 });
 * }
 * const { id, userId, user } = authData;
 * ```
 */

/**
 * Validates Bearer Token from Authorization header
 * @param request NextRequest object
 * @returns User data or null if invalid
 */
async function validateBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    // Use next-auth/jwt decode function to validate token
    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET || '',
      salt: 'next-auth.session-token',
    });
    
    if (!decoded) {
      console.error('Token 解碼失敗: decoded is null');
      return null;
    }
    
    // Get user ID from decoded token
    const userId = decoded.id as string;
    
    if (!userId) {
      console.error('Token 解碼失敗: 沒有 user ID');
      return null;
    }
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.exp as number;
    if (exp && exp < now) {
      console.error('Token 已過期');
      return null;
    }
    
    // Get user data from database
    const user = await findUserById(userId);

    if (!user) {
      console.error('使用者不存在:', userId);
      return null;
    }

    // Check user status
    if (!isUserActive(user)) {
      console.error('使用者狀態非 ACTIVE:', user.status);
      return null;
    }

    return {
      id: user.id,
      userId: user.id,
      user: user
    };
  } catch (error) {
    console.error('Token 驗證錯誤:', error);
    return null;
  }
}

/**
 * Validates session cookies using NextAuth
 * @returns User data or null if invalid
 */
async function validateSession() {
  try {
    console.log('[validateSession] Calling auth()...');
    const session = await auth();

    console.log('[validateSession] Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userRole: session?.user?.role,
    });

    if (!session?.user?.id) {
      console.log('[validateSession] No user ID in session');
      return null;
    }

    const userId = session.user.id;

    // Get user data from database
    const user = await findUserById(userId);

    if (!user) {
      console.log('[validateSession] User not found in DB:', userId);
      return null;
    }

    // Check user status
    if (!isUserActive(user)) {
      console.log('[validateSession] User inactive:', user.status);
      return null;
    }

    console.log('[validateSession] Validation successful:', userId);
    return {
      id: user.id,
      userId: user.id,
      user: user
    };
  } catch (error) {
    console.error('[validateSession] Session validation error:', error);
    return null;
  }
}

/**
 * Unified authentication helper
 * 
 * Checks Bearer Token first, then falls back to session cookies
 * 
 * @param request NextRequest object (required for Bearer Token validation)
 * @returns User data or null if authentication fails
 */
export async function getAuthData(request: NextRequest) {
  // Try Bearer Token first (for Mobile App)
  const bearerTokenData = await validateBearerToken(request);
  
  if (bearerTokenData) {
    return bearerTokenData;
  }
  
  // Fall back to session cookies (for Web App)
  const sessionData = await validateSession();
  
  if (sessionData) {
    return sessionData;
  }
  
  // Both authentication methods failed
  return null;
}

/**
 * Convenience function to get user ID only
 * 
 * @param request NextRequest object
 * @returns User ID or null if authentication fails
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const authData = await getAuthData(request);
  return authData?.userId || null;
}

/**
 * Convenience function to get full user object
 * 
 * @param request NextRequest object
 * @returns User object or null if authentication fails
 */
export async function getUser(request: NextRequest) {
  const authData = await getAuthData(request);
  return authData?.user || null;
}

/**
 * Validates token for refresh with grace period
 * @param token JWT token string
 * @returns Decoded token data or null if invalid
 */
export async function validateTokenForRefresh(token: string) {
  try {
    // Use next-auth/jwt decode function to validate token
    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET || '',
      salt: 'next-auth.session-token',
    });
    
    if (!decoded) {
      console.error('Token 解碼失敗: decoded is null');
      return null;
    }
    
    // Get user ID from decoded token
    const userId = decoded.id as string;
    
    if (!userId) {
      console.error('Token 解碼失敗: 沒有 user ID');
      return null;
    }
    
    // Check token expiration with grace period
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.exp as number;
    const iat = decoded.iat as number;
    
    if (!exp || !iat) {
      console.error('Token 缺少必要欄位: exp 或 iat');
      return null;
    }
    
    // Calculate how long ago token was issued
    const tokenAge = now - iat;
    const maxTokenAge = 60 * 24 * 60 * 60; // 60 days maximum (30 days valid + 30 days grace)
    
    if (tokenAge > maxTokenAge) {
      console.error('Token 太舊，超過最大使用期限');
      return null;
    }
    
    // Token is valid for refresh if:
    // 1. Not expired yet, OR
    // 2. Expired within last 7 days (grace period)
    const gracePeriod = 7 * 24 * 60 * 60; // 7 days in seconds
    const isExpired = exp < now;
    const isWithinGracePeriod = isExpired && (now - exp) <= gracePeriod;
    
    if (isExpired && !isWithinGracePeriod) {
      console.error('Token 已過期且超過寬限期');
      return null;
    }
    
    // Get user data from database
    const user = await findUserById(userId);

    if (!user) {
      console.error('使用者不存在:', userId);
      return null;
    }

    // Check user status
    if (!isUserActive(user)) {
      console.error('使用者狀態非 ACTIVE:', user.status);
      return null;
    }

    return {
      decoded,
      user,
      userId: user.id,
    };
  } catch (error) {
    console.error('Token 驗證錯誤:', error);
    return null;
  }
}

/**
 * Type for authentication data returned by getAuthData
 */
export interface AuthData {
  id: string;
  userId: string;
  user: any;
}