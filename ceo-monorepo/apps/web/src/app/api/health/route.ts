import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  withOptionalAuth, 
  withAuth,
  createSuccessResponse, 
  createErrorResponse,
  ErrorCode
} from '@/lib/api-middleware';
import { 
  SYSTEM_ERRORS 
} from '@/lib/constants';

// 健康檢查端點
// GET /api/health

export const GET = withOptionalAuth(async (request: NextRequest, { authData }) => {
  const startTime = Date.now();
  
  try {
    const healthChecks = {
      timestamp: new Date().toISOString(),
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

    // 2. 檢查Redis連接（如果啟用）
    // 這裡可以添加Redis健康檢查

    // 3. 檢查記憶體使用
    const memoryUsage = process.memoryUsage();
    healthChecks.checks.memory = {
      status: 'healthy',
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    };

    // 4. 檢查環境變數
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    healthChecks.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      missing: missingEnvVars
    };

    if (missingEnvVars.length > 0) {
      healthChecks.status = 'degraded';
    }

    // 5. 計算總響應時間
    const totalResponseTime = Date.now() - startTime;
    healthChecks.checks.responseTime = totalResponseTime;

    // 根據狀態返回相應的HTTP狀態碼
    const statusCode = healthChecks.status === 'healthy' ? 200 : 
                      healthChecks.status === 'degraded' ? 207 : 503;

    return createSuccessResponse(healthChecks, undefined, statusCode, {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

  } catch (error) {
    // 全局錯誤處理
    console.error('健康檢查錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤',
      503,
      {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    );
  }
});

// 健康檢查詳細信息（需要管理員認證）
export const POST = withAuth(async (request: NextRequest, { authData }) => {
  try {
    // 驗證管理員權限
    if (!authData || authData.role !== 'ADMIN' && authData.role !== 'SUPER_ADMIN') {
      return createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        '需要管理員權限才能訪問詳細健康信息',
        '權限不足',
        403
      );
    }

    // 返回安全的詳細健康信息（不包含敏感系統信息）
    const detailedHealth = {
      timestamp: new Date().toISOString(),
      status: 'healthy' as const,
      uptime: process.uptime(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        // 不返回詳細的記憶體、CPU 或平台信息，以防止被用於 DoS 攻擊規劃
      },
      user: {
        id: authData.userId,
        role: authData.role
      }
    };

    return createSuccessResponse(detailedHealth, undefined, 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

  } catch (error) {
    console.error('詳細健康檢查錯誤:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      SYSTEM_ERRORS.INTERNAL_ERROR,
      error instanceof Error ? error.message : '未知錯誤',
      500
    );
  }
}, { requireAdmin: true });