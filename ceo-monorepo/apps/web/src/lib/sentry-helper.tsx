/**
 * Sentry 輔助工具
 * 
 * 提供方便的 Sentry 集成方法，用於錯誤監控和性能跟踪
 */

import * as Sentry from '@sentry/nextjs';

/**
 * 捕獲並報告錯誤
 * 
 * @param error 錯誤對象
 * @param context 錯誤上下文
 * @param level 錯誤級別
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, any>,
  level: Sentry.SeverityLevel = 'error'
) {
  // 確保是 Error 對象
  const err = error instanceof Error ? error : new Error(String(error));
  
  // 設置錯誤上下文
  if (context) {
    Sentry.setContext('error_context', context);
  }
  
  // 設置錯誤級別
  Sentry.setTag('error_level', level);
  
  // 捕獲錯誤
  Sentry.captureException(err, {
    level,
    tags: {
      component: 'api',
      environment: process.env.NODE_ENV,
    },
    extra: context,
  });
  
  // 在開發環境中記錄錯誤
  if (process.env.NODE_ENV === 'development') {
    console.error('🔴 Sentry 錯誤捕獲:', {
      error: err.message,
      stack: err.stack,
      context,
      level,
    });
  }
}

/**
 * 捕獲 API 錯誤
 * 
 * @param error 錯誤對象
 * @param endpoint API 端點
 * @param method HTTP 方法
 * @param userId 用戶 ID（可選）
 */
export function captureApiError(
  error: Error | unknown,
  endpoint: string,
  method: string = 'GET',
  userId?: string
) {
  const context = {
    endpoint,
    method,
    userId,
    timestamp: new Date().toISOString(),
  };
  
  // 設置用戶信息
  if (userId) {
    Sentry.setUser({ id: userId });
  }
  
  captureError(error, context, 'error');
}

/**
 * 捕獲業務邏輯錯誤
 * 
 * @param error 錯誤對象
 * @param module 模塊名稱
 * @param operation 操作名稱
 */
export function captureBusinessError(
  error: Error | unknown,
  module: string,
  operation: string
) {
  const context = {
    module,
    operation,
    type: 'business_error',
    timestamp: new Date().toISOString(),
  };
  
  captureError(error, context, 'warning');
}

/**
 * 開始性能跟踪
 * 
 * @param name 跟踪名稱
 * @param operation 操作名稱
 * @returns 跟踪事務
 */
export function startPerformanceTrace(name: string, operation: string) {
  // Sentry v8 使用 startSpan 替代已棄用的 startTransaction
  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    (span) => {
      // 在開發環境中記錄
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Sentry 性能跟踪開始:', { name, operation });
      }
      return span;
    }
  );
}

/**
 * 設置用戶上下文
 * 
 * @param userId 用戶 ID
 * @param email 用戶郵箱（可選）
 * @param role 用戶角色（可選）
 */
export function setUserContext(
  userId: string,
  email?: string,
  role?: string
) {
  Sentry.setUser({
    id: userId,
    email,
    role,
  });
  
  // 設置額外標籤
  Sentry.setTag('user_role', role || 'unknown');
}

/**
 * 清除用戶上下文
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * 設置請求上下文
 * 
 * @param requestId 請求 ID
 * @param path 請求路徑
 * @param method HTTP 方法
 */
export function setRequestContext(
  requestId: string,
  path: string,
  method: string
) {
  Sentry.setTag('request_id', requestId);
  Sentry.setTag('request_path', path);
  Sentry.setTag('request_method', method);
  
  // 設置上下文
  Sentry.setContext('request', {
    id: requestId,
    path,
    method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 設置版本信息
 * 
 * @param version 版本號
 * @param commitHash Git 提交哈希（可選）
 */
export function setReleaseContext(version: string, commitHash?: string) {
  Sentry.setTag('version', version);
  
  if (commitHash) {
    Sentry.setTag('commit_hash', commitHash);
  }
  
  Sentry.setContext('release', {
    version,
    commit_hash: commitHash,
    environment: process.env.NODE_ENV,
  });
}

/**
 * 手動發送消息到 Sentry
 * 
 * @param message 消息內容
 * @param level 消息級別
 * @param context 上下文信息
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    tags: {
      type: 'manual_message',
      environment: process.env.NODE_ENV,
    },
    extra: context,
  });
  
  // 在開發環境中記錄
  if (process.env.NODE_ENV === 'development') {
    console.log('📨 Sentry 消息:', { message, level, context });
  }
}

/**
 * 創建 Sentry 錯誤邊界組件（用於 React）
 * 
 * @param Component 要包裹的組件
 * @param fallback 錯誤回退組件
 * @returns 包裹後的組件
 */
export function withSentryErrorBoundary<T extends React.ComponentType<any>>(
  Component: T,
  fallback?: React.ReactNode
) {
  const WrappedComponent = (props: any) => {
    try {
      return <Component {...props} />;
    } catch (error) {
      // 捕獲錯誤
      captureError(error, {
        component: Component.name || 'UnknownComponent',
        props: Object.keys(props),
      });
      
      // 返回回退 UI
      return fallback || <div>組件加載失敗</div>;
    }
  };
  
  WrappedComponent.displayName = `SentryErrorBoundary(${Component.name || 'Component'})`;
  
  return WrappedComponent as T;
}

/**
 * 檢查 Sentry 是否已初始化
 * 
 * @returns 是否已初始化
 */
export function isSentryInitialized(): boolean {
  // Sentry v8 使用 getClient() 替代已棄用的 getCurrentHub()
  return !!Sentry.getClient();
}

/**
 * 獲取 Sentry 跟踪 ID（用於錯誤關聯）
 * 
 * @returns 跟踪 ID
 */
export function getTraceId(): string | undefined {
  // Sentry v8 使用 getActiveSpan() 替代已棄用的 getCurrentHub()
  const span = Sentry.getActiveSpan();
  return span ? Sentry.spanToJSON(span).span_id : undefined;
}

export default {
  captureError,
  captureApiError,
  captureBusinessError,
  startPerformanceTrace,
  setUserContext,
  clearUserContext,
  setRequestContext,
  setReleaseContext,
  captureMessage,
  withSentryErrorBoundary,
  isSentryInitialized,
  getTraceId,
};