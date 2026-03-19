/**
 * API v1 健康檢查端點
 * 
 * 版本: v1
 * 路徑: /api/v1/health
 * 描述: 提供系統健康狀態檢查
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withOptionalAuth,
  withAdminAuth,
  createSuccessResponse,
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import {
  SYSTEM_ERRORS
} from '@/lib/constants';

// GET /api/v1/health - 公開健康檢查
export const GET = withOptionalAuth(async (request: NextRequest, { authData }) => {
  const startTime = Date.now();
  
  try {
    const healthChecks = {
      timestamp: new Date().toISOString(),
      version: 'v1',
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      uptime: process.uptime(),
      checks: {} as Record<string, unknown>
    };

    // 1. 檢查資料庫連接
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthChecks.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      healthChecks.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      healthChecks.status = 'degraded';
    }

    // 2. 檢查記憶體使用
    const memoryUsage = process.memoryUsage();
    healthChecks.checks.memory = {
      status: 'healthy',
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    };

    // 3. 檢查環境變數
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    healthChecks.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      missing: missingEnvVars
    };

    if (missingEnvVars.length > 0) {
      healthChecks.status = 'degraded';
    }

    // 4. 計算總響應時間
    const totalResponseTime = Date.now() - startTime;
    healthChecks.checks.responseTime = totalResponseTime;

    // 根據狀態返回相應的HTTP狀態碼
    const statusCode = healthChecks.status === 'healthy' ? 200 : 
                      healthChecks.status === 'degraded' ? 207 : 503;

    const res = createSuccessResponse(healthChecks, undefined, statusCode);
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.headers.set('X-API-Version', 'v1');
    return res;

  } catch (error) {
    // 全局錯誤處理
    console.error('v1 健康檢查錯誤:', error);
    const errRes = createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤',
      503
    );
    errRes.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    errRes.headers.set('X-API-Version', 'v1');
    return errRes;
  }
});

// POST /api/v1/health - 詳細健康檢查（需要管理員認證）
export const POST = withAdminAuth(async (request: NextRequest, { authData }) => {
  try {
    // 驗證管理員權限
    const userRole = authData?.user?.role;
    if (!authData || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
      return createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        '需要管理員權限才能訪問詳細健康信息',
        '權限不足',
        403
      );
    }

    // 返回詳細健康信息
    const detailedHealth = {
      timestamp: new Date().toISOString(),
      version: 'v1',
      status: 'healthy' as const,
      uptime: process.uptime(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NODE_VERSION: process.version,
        PLATFORM: process.platform,
        ARCH: process.arch
      },
      user: {
        id: authData.userId,
        role: userRole
      },
      system: {
        cpus: require('os').cpus().length,
        totalMemory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + ' GB',
        freeMemory: Math.round(require('os').freemem() / 1024 / 1024 / 1024) + ' GB'
      }
    };

    const detailedRes = createSuccessResponse(detailedHealth, undefined, 200);
    detailedRes.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    detailedRes.headers.set('X-API-Version', 'v1');
    return detailedRes;

  } catch (error) {
    console.error('v1 詳細健康檢查錯誤:', error);
    const detailErrRes = createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤',
      500
    );
    detailErrRes.headers.set('X-API-Version', 'v1');
    return detailErrRes;
  }
});