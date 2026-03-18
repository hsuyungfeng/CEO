import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 健康檢查端點
// GET /api/health

export async function GET() {
  const startTime = Date.now();
  
  try {
    const healthChecks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      checks: {} as Record<string, any>
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

    return NextResponse.json(healthChecks, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    // 全局錯誤處理
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime()
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

// 健康檢查詳細信息（需要認證）
export async function POST(request: Request) {
  try {
    // 這裡可以添加認證邏輯
    // 例如檢查管理員權限
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    // 驗證token邏輯...

    // 返回詳細健康信息
    const detailedHealth = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        APP_ENV: process.env.APP_ENV,
        // 不返回敏感環境變數
      }
    };

    return NextResponse.json(detailedHealth, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}