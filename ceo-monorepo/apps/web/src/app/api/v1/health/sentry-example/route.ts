/**
 * Sentry 集成示例 API
 *
 * 展示如何在 API 路由中集成 Sentry 進行錯誤監控和性能跟踪
 * 已更新為 Sentry v8 API（移除已棄用的 withSentry 和 startTransaction）
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  captureApiError,
  captureMessage,
  setRequestContext
} from '@/lib/sentry-helper';

// GET 處理函數
export async function GET(request: NextRequest) {
  try {
    // 設置請求上下文
    const requestId = Math.random().toString(36).substr(2, 9);
    setRequestContext(requestId, '/api/v1/health/sentry-example', 'GET');

    // 使用 Sentry v8 startSpan 進行性能跟踪
    return await Sentry.startSpan(
      { name: 'sentry-example-api', op: 'http.server' },
      async () => {
        // 模擬一些處理邏輯
        await new Promise(resolve => setTimeout(resolve, 100));

        // 發送一個自定義消息到 Sentry
        captureMessage('Sentry 示例 API 被訪問', 'info', {
          endpoint: '/api/v1/health/sentry-example',
          method: 'GET',
          timestamp: new Date().toISOString(),
        });

        // 模擬可選的錯誤測試
        const testError = request.nextUrl.searchParams.get('test_error');
        if (testError === 'true') {
          // 故意拋出錯誤以測試 Sentry 捕獲
          throw new Error('這是測試 Sentry 錯誤捕獲的示例錯誤');
        }

        return NextResponse.json({
          success: true,
          message: 'Sentry 集成示例 API',
          data: {
            sentry_initialized: true,
            request_id: requestId,
            timestamp: new Date().toISOString(),
            features: [
              '錯誤監控',
              '性能跟踪',
              '用戶會話跟踪',
              '發布跟踪',
              '源映射支持'
            ],
            endpoints: {
              health: '/api/v1/health',
              user_profile: '/api/v1/user/profile',
              suppliers: '/api/v1/suppliers',
              orders: '/api/v1/orders',
            }
          }
        }, {
          status: 200,
          headers: {
            'X-API-Version': 'v1',
            'X-Request-ID': requestId,
          }
        });
      }
    );

  } catch (error) {
    // 捕獲並報告 API 錯誤
    captureApiError(
      error,
      '/api/v1/health/sentry-example',
      'GET'
    );

    // 返回錯誤響應
    return NextResponse.json({
      success: false,
      error: {
        code: 'SENTRY_TEST_ERROR',
        message: 'Sentry 測試錯誤',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : String(error))
          : '錯誤已記錄到監控系統'
      }
    }, {
      status: 500,
      headers: {
        'X-API-Version': 'v1',
      }
    });
  }
}

// POST 處理函數
export async function POST(request: NextRequest) {
  try {
    // 設置請求上下文
    const requestId = Math.random().toString(36).substr(2, 9);
    setRequestContext(requestId, '/api/v1/health/sentry-example', 'POST');

    // 使用 Sentry v8 startSpan 進行性能跟踪
    return await Sentry.startSpan(
      { name: 'sentry-example-api-post', op: 'http.server' },
      async () => {
        // 解析請求體
        const body = await request.json().catch(() => ({}));

        // 發送自定義消息
        captureMessage('Sentry 示例 POST API 被訪問', 'info', {
          endpoint: '/api/v1/health/sentry-example',
          method: 'POST',
          body_type: typeof body,
          timestamp: new Date().toISOString(),
        });

        // 模擬處理時間
        await new Promise(resolve => setTimeout(resolve, 150));

        return NextResponse.json({
          success: true,
          message: 'Sentry POST 示例成功',
          data: {
            request_id: requestId,
            received_body: body,
            sentry_integration: 'active',
            performance_monitoring: 'enabled',
            error_tracking: 'enabled',
          }
        }, {
          status: 201,
          headers: {
            'X-API-Version': 'v1',
            'X-Request-ID': requestId,
          }
        });
      }
    );

  } catch (error) {
    // 捕獲並報告 API 錯誤
    captureApiError(
      error,
      '/api/v1/health/sentry-example',
      'POST'
    );

    return NextResponse.json({
      success: false,
      error: {
        code: 'SENTRY_POST_ERROR',
        message: 'POST 請求處理失敗',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : String(error))
          : '錯誤已記錄到監控系統'
      }
    }, {
      status: 500,
      headers: {
        'X-API-Version': 'v1',
      }
    });
  }
}
