/**
 * Sentry 測試 API 端點
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureError, captureApiError } from '@/lib/sentry-helper';
import { isSentryConfigured } from '@/lib/sentry-init';

export async function GET(request: NextRequest) {
  try {
    // 檢查 Sentry 配置
    const sentryConfigured = isSentryConfigured();
    
    // 測試錯誤捕獲
    let testErrorCaptured = false;
    let testApiErrorCaptured = false;
    
    if (sentryConfigured) {
      try {
        // 測試 captureError
        captureError(new Error('測試錯誤 - 這是一個測試錯誤用於驗證 Sentry 配置'));
        testErrorCaptured = true;
        
        // 測試 captureApiError
        captureApiError(
          new Error('測試 API 錯誤'),
          {
            endpoint: '/api/v1/test-sentry',
            method: 'GET',
            userId: 'test-user-123'
          }
        );
        testApiErrorCaptured = true;
      } catch (error) {
        console.error('Sentry 測試錯誤:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        sentry: {
          configured: sentryConfigured,
          environment: process.env.SENTRY_ENVIRONMENT || '未設置',
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? '已設置' : '未設置',
          tests: {
            errorCapture: testErrorCaptured,
            apiErrorCapture: testApiErrorCaptured
          }
        },
        message: 'Sentry 測試完成。請檢查 Sentry 儀表板以查看測試錯誤。'
      }
    }, { status: 200 });
    
  } catch (error: unknown) {
    // 捕獲並報告錯誤
    captureError(error, {
      context: 'Sentry 測試端點錯誤',
      endpoint: '/api/v1/test-sentry'
    });

    return NextResponse.json({
      success: false,
      data: null,
      error: {
        code: 'SENTRY_TEST_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}