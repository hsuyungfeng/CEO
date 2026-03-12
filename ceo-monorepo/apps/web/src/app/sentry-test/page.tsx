/**
 * Sentry 測試頁面
 * 
 * 用於測試 Sentry 錯誤監控和性能跟踪
 */

'use client';

import { useState, useEffect } from 'react';
import * as SentryModule from '@sentry/nextjs';
import { captureError, startPerformanceTrace } from '@/lib/sentry-helper';

const Sentry = SentryModule;

export default function SentryTestPage() {
  const [testResults, setTestResults] = useState<Array<{
    name: string;
    status: 'pending' | 'success' | 'error';
    message: string;
  }>>([
    { name: 'Sentry 初始化', status: 'pending', message: '檢查中...' },
    { name: '錯誤捕獲測試', status: 'pending', message: '等待測試' },
    { name: '性能跟踪測試', status: 'pending', message: '等待測試' },
    { name: '用戶上下文測試', status: 'pending', message: '等待測試' },
  ]);

  // 檢查 Sentry 初始化
  useEffect(() => {
    const checkSentry = async () => {
      try {
        // 檢查 Sentry 是否已初始化
        const isInitialized = Sentry.getClient() !== undefined;
        
        updateTestResult(0, isInitialized ? 'success' : 'error', 
          isInitialized ? 'Sentry 已正確初始化' : 'Sentry 未初始化，請檢查配置');
      } catch (error) {
        updateTestResult(0, 'error', `檢查失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      }
    };

    checkSentry();
  }, []);

  // 測試錯誤捕獲
  const testErrorCapture = () => {
    try {
      updateTestResult(1, 'pending', '正在測試錯誤捕獲...');
      
      // 捕獲一個測試錯誤
      captureError(new Error('這是一個 Sentry 測試錯誤'), {
        test: true,
        component: 'SentryTestPage',
        timestamp: new Date().toISOString(),
      });

      updateTestResult(1, 'success', '錯誤已成功捕獲並發送到 Sentry');
    } catch (error) {
      updateTestResult(1, 'error', `錯誤捕獲測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  // 測試性能跟踪
  const testPerformanceTrace = async () => {
    try {
      updateTestResult(2, 'pending', '正在測試性能跟踪...');
      
      // 開始性能跟踪
      const trace = startPerformanceTrace('sentry-test-operation', '測試操作');
      
      // 模擬一些工作
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 結束跟踪
      trace.finish();
      
      updateTestResult(2, 'success', '性能跟踪已成功記錄');
    } catch (error) {
      updateTestResult(2, 'error', `性能跟踪測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  // 測試用戶上下文
  const testUserContext = () => {
    try {
      updateTestResult(3, 'pending', '正在測試用戶上下文...');
      
      // 設置測試用戶
      Sentry.setUser({
        id: 'test-user-123',
        email: 'test@example.com',
        username: '測試用戶',
        role: '測試員',
      });

      updateTestResult(3, 'success', '用戶上下文已設置');
    } catch (error) {
      updateTestResult(3, 'error', `用戶上下文測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  // 更新測試結果
  const updateTestResult = (index: number, status: 'pending' | 'success' | 'error', message: string) => {
    setTestResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], status, message };
      return newResults;
    });
  };

  // 運行所有測試
  const runAllTests = async () => {
    testErrorCapture();
    await testPerformanceTrace();
    testUserContext();
  };

  // 手動觸發錯誤（用於測試錯誤邊界）
  const triggerError = () => {
    throw new Error('手動觸發的測試錯誤（用於測試錯誤邊界）');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Sentry 監控系統測試</h1>
      
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">測試說明</h2>
        <p className="mb-2">這個頁面用於測試 Sentry 錯誤監控和性能跟踪功能。</p>
        <p className="text-sm text-gray-600">
          注意：這些測試會將數據發送到 Sentry。請確保您已正確配置 Sentry DSN。
        </p>
      </div>

      {/* 測試結果 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">測試結果</h2>
        <div className="space-y-4">
          {testResults.map((test, index) => (
            <div 
              key={index}
              className={`p-4 border rounded-lg ${
                test.status === 'success' ? 'bg-green-50 border-green-200' :
                test.status === 'error' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{test.name}</h3>
                  <p className="text-sm text-gray-600">{test.message}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  test.status === 'success' ? 'bg-green-100 text-green-800' :
                  test.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {test.status === 'success' ? '通過' : 
                   test.status === 'error' ? '失敗' : '進行中'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 測試按鈕 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">測試操作</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            運行所有測試
          </button>
          
          <button
            onClick={testErrorCapture}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            測試錯誤捕獲
          </button>
          
          <button
            onClick={testPerformanceTrace}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            測試性能跟踪
          </button>
          
          <button
            onClick={testUserContext}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            測試用戶上下文
          </button>
          
          <button
            onClick={triggerError}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            手動觸發錯誤（測試錯誤邊界）
          </button>
        </div>
      </div>

      {/* 配置信息 */}
      <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Sentry 配置信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-1">環境變數</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
              {`NEXT_PUBLIC_SENTRY_DSN: ${process.env.NEXT_PUBLIC_SENTRY_DSN ? '已設置' : '未設置'}
NODE_ENV: ${process.env.NODE_ENV}
SENTRY_ENVIRONMENT: ${process.env.SENTRY_ENVIRONMENT || '未設置'}`}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-1">Sentry 狀態</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
              {`客戶端: ${Sentry.getClient() ? '已初始化' : '未初始化'}
版本: ${typeof (Sentry as any).getSDKVersion === 'function' ? (Sentry as any).getSDKVersion() : '未知'}
環境: ${Sentry.getCurrentHub?.()?.getScope?.()?.getTransaction?.()?.tags?.environment || '未知'}`}
            </pre>
          </div>
        </div>
      </div>

      {/* 使用說明 */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">使用說明</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>確保在 <code className="bg-gray-100 px-1 rounded">.env.local</code> 文件中設置 <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SENTRY_DSN</code></li>
          <li>運行測試後，請在 Sentry 儀表板中查看結果</li>
          <li>「手動觸發錯誤」按鈕用於測試 Next.js 錯誤邊界</li>
          <li>性能跟踪測試會記錄一個 500ms 的操作</li>
          <li>用戶上下文測試會設置一個測試用戶</li>
        </ul>
      </div>
    </div>
  );
}