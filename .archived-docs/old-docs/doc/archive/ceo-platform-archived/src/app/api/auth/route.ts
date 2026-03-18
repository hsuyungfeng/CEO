import { NextRequest, NextResponse } from 'next/server';
import { jwtManager } from '@/lib/jwt-manager';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * Request schema for token refresh
 */
const refreshSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能為空'),
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = refreshSchema.parse(body);

    // Verify refresh token
    const decoded = jwtManager.verifyRefreshToken(refreshToken);

    if (!decoded) {
      logger.warn({ token: refreshToken.substring(0, 20) + '...' }, '無效的刷新令牌');
      return NextResponse.json(
        { error: '無效的刷新令牌' },
        { status: 401 }
      );
    }

    // Generate new token pair
    const tokenPair = jwtManager.generateTokenPair(decoded.userId, decoded.email);

    if (!tokenPair) {
      logger.error({ userId: decoded.userId }, '無法生成新令牌對');
      return NextResponse.json(
        { error: '令牌刷新失敗' },
        { status: 500 }
      );
    }

    logger.info({ userId: decoded.userId, email: decoded.email }, '令牌刷新成功');

    return NextResponse.json(tokenPair);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ issues: error.issues }, '刷新請求驗證失敗');
      return NextResponse.json(
        { error: '無效的請求' },
        { status: 400 }
      );
    }

    logger.error({ err: error }, '令牌刷新錯誤');
    return NextResponse.json(
      { error: '令牌刷新失敗' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/refresh
 * Get current token info (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '缺少授權頭' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const payload = jwtManager.decodeToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: '無效的令牌' },
        { status: 401 }
      );
    }

    const remaining = jwtManager.getTokenRemainingTime(token);

    return NextResponse.json({
      userId: payload.userId,
      email: payload.email,
      type: payload.type,
      expiresIn: remaining,
      isExpired: remaining <= 0,
    });
  } catch (error) {
    logger.error({ err: error }, '令牌信息檢索錯誤');
    return NextResponse.json(
      { error: '無法檢索令牌信息' },
      { status: 500 }
    );
  }
}
