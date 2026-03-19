import { NextRequest, NextResponse } from 'next/server';
import { defaultAPITimeoutMiddleware } from '@/lib/api-timeout-middleware';

/**
 * 超時測試 API 端點
 * 用於驗證 API 超時中介軟體功能
 */

// 使用超時中介軟體包裝處理器
export const GET = defaultAPITimeoutMiddleware.middleware(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const delay = parseInt(searchParams.get('delay') || '40000'); // 預設 40 秒
  
  console.log(`超時測試: 開始 ${delay}ms 延遲`);
  
  // 模擬長時間運行的操作
  await new Promise(resolve => setTimeout(resolve, delay));
  
  console.log(`超時測試: 完成 ${delay}ms 延遲`);
  
  return NextResponse.json({
    success: true,
    message: `操作完成，延遲 ${delay}ms`,
    timestamp: new Date().toISOString(),
    timeout: defaultAPITimeoutMiddleware['getTimeoutForEndpoint']?.(request.nextUrl.pathname) || 30000,
  });
});

// 簡單的 POST 端點，用於測試不同超時配置
export const POST = async (request: NextRequest) => {
  try {
    // 使用 withTimeout 方法
    const result = await defaultAPITimeoutMiddleware.withTimeout(
      request,
      async () => {
        const body = await request.json();
        const delay = body.delay || 35000; // 35 秒，略超過預設超時
        
        console.log(`POST 超時測試: 開始 ${delay}ms 延遲`);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`POST 超時測試: 完成 ${delay}ms 延遲`);
        
        return {
          success: true,
          message: `POST 操作完成，延遲 ${delay}ms`,
          timestamp: new Date().toISOString(),
        };
      },
      10000 // 自訂超時 10 秒
    );
    
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    if (error instanceof Error && message.includes('API 請求超時')) {
      return NextResponse.json({
        success: false,
        error: '請求超時',
        code: 'REQUEST_TIMEOUT',
        message,
      }, { status: 504 });
    }

    return NextResponse.json({
      success: false,
      error: '伺服器錯誤',
      message,
    }, { status: 500 });
  }
};

// 健康檢查端點，不應超時
export const HEAD = async () => {
  return new NextResponse(null, { status: 200 });
};