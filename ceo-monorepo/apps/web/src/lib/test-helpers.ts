/**
 * 測試輔助函數 - 用於測試新中介層系統的 API
 */

import { NextRequest } from 'next/server'

interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company?: string;
  phone?: string;
  [key: string]: unknown;
}

interface ParsedApiResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  success: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pagination: any;
  status: number;
  statusText: string;
}

interface TestRequestConfig {
  url?: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface TestContext {
  params: Promise<Record<string, string>>;
  authData: { userId: string; role: string; [key: string]: unknown } | null;
}

/**
 * 創建模擬的 NextRequest 對象
 */
export function createMockNextRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    init.body = JSON.stringify(body)
  }

  if (process.env.NODE_ENV === 'test') {
    return {
      url,
      method,
      headers: new Headers(headers),
      json: async () => body ?? {},
      text: async () => JSON.stringify(body ?? {}),
      clone: function() { return this },
    } as unknown as NextRequest
  }

  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1])
}

/**
 * 創建帶有認證的模擬請求
 */
export function createAuthenticatedRequest(
  userId: string,
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: unknown,
  role: string = 'MEMBER'
): NextRequest {
  return createMockNextRequest(method, url, body, {
    'Authorization': `Bearer test-token-${userId}`,
    'X-User-Id': userId,
    'X-User-Role': role,
  })
}

/**
 * 創建管理員請求
 */
export function createAdminRequest(
  userId: string = 'admin-test-id',
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: unknown
): NextRequest {
  return createAuthenticatedRequest(userId, method, url, body, 'ADMIN')
}

/**
 * 創建供應商請求
 */
export function createSupplierRequest(
  userId: string = 'supplier-test-id',
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: unknown
): NextRequest {
  return createAuthenticatedRequest(userId, method, url, body, 'SUPPLIER')
}

/**
 * 解析 API 響應
 */
export async function parseApiResponse(response: Response | ParsedApiResponse): Promise<ParsedApiResponse> {
  if (response instanceof Response) {
    const data = await response.json() as Record<string, unknown>
    return {
      success: data['success'],
      data: data['data'],
      error: data['error'],
      pagination: data['pagination'],
      status: response.status,
      statusText: response.statusText,
    }
  }

  return {
    success: response.success,
    data: response.data,
    error: response.error,
    pagination: response.pagination,
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
  }
}

/**
 * 測試輔助：驗證成功的 API 響應
 */
export function expectSuccessResponse(result: ParsedApiResponse, expectedData?: unknown) {
  expect(result.success).toBe(true)
  expect(result.error).toBeNull()

  if (expectedData) {
    expect(result.data).toEqual(expect.objectContaining(expectedData as Record<string, unknown>))
  }
}

/**
 * 測試輔助：驗證錯誤的 API 響應
 */
export function expectErrorResponse(
  result: ParsedApiResponse,
  expectedErrorCode?: string,
  expectedStatusCode?: number
) {
  expect(result.success).toBe(false)
  expect(result.data).toBeNull()
  expect(result.error).toBeDefined()

  if (expectedErrorCode) {
    expect((result.error as Record<string, unknown>)['code']).toBe(expectedErrorCode)
  }

  if (expectedStatusCode) {
    expect(result.status).toBe(expectedStatusCode)
  }
}

/**
 * 創建測試上下文（用於模擬中介層上下文）
 */
export function createTestContext(params: Record<string, string> = {}): TestContext {
  return {
    params: Promise.resolve(params),
    authData: null,
  }
}

/**
 * 設置測試認證數據
 */
export function setTestAuthData(
  context: TestContext,
  userId: string,
  role: string = 'MEMBER',
  additionalData: Record<string, unknown> = {}
) {
  context.authData = {
    userId,
    role,
    ...additionalData,
  }
}

/**
 * 創建測試用戶對象
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 'test-user-id-' + Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    name: 'Test User',
    role: 'MEMBER',
    company: 'Test Company',
    phone: '0912345678',
    ...overrides,
  }
}

/**
 * 創建模擬認證數據
 */
export function mockAuthData(user: Partial<TestUser> | null = null) {
  const resolvedUser = user ?? createTestUser()
  return {
    userId: resolvedUser.id,
    email: resolvedUser.email,
    role: resolvedUser.role ?? 'MEMBER',
    name: resolvedUser.name,
  }
}

/**
 * 創建測試請求（帶有可選的 body）
 */
export function createTestRequest(config: TestRequestConfig): NextRequest {
  const { url = 'http://localhost:3000/api/test', method = 'GET', body, headers = {} } = config;

  return {
    url,
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
    json: async () => body ?? {},
    text: async () => JSON.stringify(body ?? {}),
    clone: function() { return this },
  } as unknown as NextRequest;
}
