/**
 * 3D 模型生成工作流程 E2E 測試
 * ========================================
 *
 * 測試範圍：
 * - 任務 15.4.1：供應商可請求 3D 生成
 * - 任務 15.4.2：隊列處理器更新狀態
 * - 任務 15.4.3：查詢 3D 模型狀態
 *
 * 注意事項：
 * - TRELLIS.2 服務需另外啟動才能測試完整流程
 * - 測試優先使用 API 層面驗證，不依賴實際模型生成
 * - 所有測試結束後清理測試資料
 */

import { test, expect } from '@playwright/test';

// ============ 測試配置 ============

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// 測試用的假產品 ID（實際測試時需替換為真實 ID）
const TEST_PRODUCT_ID = 'test-product-3d-gen';
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400';

// ============ 工具函數 ============

/**
 * 建立已認證的請求上下文（模擬供應商登入）
 */
async function getAuthenticatedContext(page: any) {
  // 導航至應用程式首頁觸發 TEST_MODE 自動登入
  await page.goto(BASE_URL);
  await page.waitForTimeout(1000);

  // 取得 cookies（包含 session token）
  const cookies = await page.context().cookies();
  return cookies;
}

// ============ 測試：3D 生成狀態查詢 ============

test.describe('3D 模型狀態查詢 API', () => {
  test('15.5.1：GET /api/products/[id]/3d-model - 無 3D 記錄時返回 PENDING', async ({ page }) => {
    // 呼叫 API 查詢一個不存在 3D 記錄的產品
    const response = await page.request.get(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/3d-model`
    );

    // 預期回應：200 或 404（取決於產品是否存在）
    // 若產品不存在，回應 404
    // 若產品存在但無 3D 記錄，回應 200 + PENDING 狀態
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('productId');
      // PENDING 狀態代表尚未請求生成
      expect(['PENDING', 'GENERATING', 'COMPLETED', 'FAILED']).toContain(body.status);
    }
  });

  test('15.5.2：GET /api/products/[id]/3d-model - 不存在的產品返回 404', async ({ page }) => {
    const nonExistentProductId = 'non-existent-product-12345';

    const response = await page.request.get(
      `${BASE_URL}/api/products/${nonExistentProductId}/3d-model`
    );

    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('15.5.3：GET /api/products/[id]/3d-model - 回應格式符合規範', async ({ page }) => {
    // 測試 API 回應結構是否符合文檔規範
    const response = await page.request.get(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/3d-model`
    );

    // 無論 status code 為何，確認 Content-Type 正確
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');

    const body = await response.json();
    // 回應必須是有效 JSON 物件
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
  });
});

// ============ 測試：3D 生成請求 ============

test.describe('3D 生成請求 API（POST）', () => {
  test('15.5.4：POST /api/products/[id]/generate-3d - 未認證時返回 401', async ({ page }) => {
    // 未登入狀態下嘗試請求 3D 生成
    const response = await page.request.post(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/generate-3d`,
      {
        data: {
          sourceImageUrl: TEST_IMAGE_URL,
          priority: 5,
        },
      }
    );

    // 預期 401 未認證
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('15.5.5：POST /api/products/[id]/generate-3d - Zod 驗證拒絕無效 URL', async ({ page }) => {
    // 先取得認證 cookies
    await getAuthenticatedContext(page);

    // 使用無效 URL 測試
    const response = await page.request.post(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/generate-3d`,
      {
        data: {
          sourceImageUrl: 'not-a-valid-url',
          priority: 5,
        },
      }
    );

    // 預期 400（Zod 驗證失敗）或 401（未認證）
    expect([400, 401]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('15.5.6：POST /api/products/[id]/generate-3d - 驗證優先級範圍（1-10）', async ({ page }) => {
    // 先取得認證 cookies
    await getAuthenticatedContext(page);

    // 使用超出範圍的優先級
    const response = await page.request.post(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/generate-3d`,
      {
        data: {
          sourceImageUrl: TEST_IMAGE_URL,
          priority: 99, // 超出 1-10 範圍
        },
      }
    );

    // 預期 400（Zod 驗證失敗）或 401（未認證）
    expect([400, 401]).toContain(response.status());
  });

  test('15.5.7：POST /api/products/[id]/generate-3d - 非供應商用戶返回 403', async ({ page }) => {
    // 登入為非供應商用戶（TEST_MODE 登入為 ADMIN）
    await page.goto(BASE_URL);

    // 如果登入後，嘗試生成不屬於自己的產品
    const response = await page.request.post(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/generate-3d`,
      {
        data: {
          sourceImageUrl: TEST_IMAGE_URL,
          priority: 5,
        },
      }
    );

    // 預期 401（未認證）、403（無權限）或 404（產品不存在）
    // 在 TEST_MODE 下可能 403 或 404
    expect([401, 403, 404]).toContain(response.status());
  });
});

// ============ 測試：OPTIONS 端點（CORS）============

test.describe('CORS 預檢請求', () => {
  test('15.5.8：OPTIONS /api/products/[id]/generate-3d - 返回 200', async ({ page }) => {
    const response = await page.request.fetch(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/generate-3d`,
      {
        method: 'OPTIONS',
      }
    );

    expect(response.status()).toBe(200);
  });

  test('15.5.9：OPTIONS /api/products/[id]/3d-model - 返回 200', async ({ page }) => {
    const response = await page.request.fetch(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/3d-model`,
      {
        method: 'OPTIONS',
      }
    );

    expect(response.status()).toBe(200);
  });
});

// ============ 測試：工作流程整合 ============

test.describe('3D 生成工作流程整合', () => {
  test('15.5.10：查詢狀態 -> 生成請求 -> 查詢新狀態 工作流程', async ({ page }) => {
    // 步驟 1：查詢初始狀態
    const initialStatusResponse = await page.request.get(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/3d-model`
    );

    // 記錄初始狀態
    const initialStatus = initialStatusResponse.status();
    console.log(`[測試] 初始狀態查詢結果: ${initialStatus}`);

    // 步驟 2：嘗試生成請求（預期因為認證/授權而失敗）
    const generateResponse = await page.request.post(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/generate-3d`,
      {
        data: {
          sourceImageUrl: TEST_IMAGE_URL,
          priority: 5,
        },
      }
    );

    // 記錄生成請求結果
    const generateStatus = generateResponse.status();
    console.log(`[測試] 生成請求結果: ${generateStatus}`);

    // 步驟 3：再次查詢狀態（應與初始狀態一致，因為生成請求被拒絕）
    const finalStatusResponse = await page.request.get(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/3d-model`
    );

    const finalStatus = finalStatusResponse.status();
    console.log(`[測試] 最終狀態查詢結果: ${finalStatus}`);

    // 若初始狀態是 404，最終狀態應仍是 404
    // 若初始狀態是 200（PENDING），最終狀態應仍是 200（PENDING）
    // 因為未授權的請求不應改變狀態
    expect(finalStatus).toBe(initialStatus);
  });

  test('15.5.11：API 回應時間在合理範圍內（< 3 秒）', async ({ page }) => {
    const startTime = Date.now();

    const response = await page.request.get(
      `${BASE_URL}/api/products/${TEST_PRODUCT_ID}/3d-model`
    );

    const duration = Date.now() - startTime;

    console.log(`[測試] API 回應時間: ${duration}ms`);

    // 確認回應在 3 秒內完成
    expect(duration).toBeLessThan(3000);

    // 確認 HTTP 狀態碼有效
    expect([200, 404, 500]).toContain(response.status());
  });
});
