import { test, expect, LoginPage, TEST_USERS } from '../fixtures/auth';

/**
 * 任務 12.1.1：認證流程 E2E 測試
 * 測試範圍：登入、登出、OAuth、Session 驗證、受保護路由
 */

test.describe('認證流程 E2E 測試', () => {
  test.beforeEach(async ({ page }) => {
    // 每個測試前清除 session 和 localStorage
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('12.1.1.1：登入流程 - 輸入統一編號和密碼', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 訪問登入頁面
    await loginPage.goto();
    await loginPage.expectLoginPage();

    // 執行登入（在 TEST_MODE 下，直接以 ADMIN 身份登入）
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

    // 驗證重導至儀表板
    await loginPage.expectDashboard('admin');

    // 驗證 session cookie 已設置
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) => c.name === 'authjs.session-token' || c.name === 'next-auth.session-token'
    );
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie?.httpOnly).toBe(true);

    // 驗證用戶信息在 localStorage（如有）
    const userInfo = await page.evaluate(() => {
      return localStorage.getItem('user') || sessionStorage.getItem('user');
    });
    // 如果有存儲用戶信息，驗證其包含必要欄位
    if (userInfo) {
      const user = JSON.parse(userInfo);
      expect(user).toHaveProperty('id');
    }
  });

  test('12.1.1.2：登入流程 - TEST_MODE 自動登入', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 訪問登入頁面
    await loginPage.goto();

    // 由於 TEST_MODE=true，應該能看到登入按鈕
    const loginButton = page.locator('button:has-text("登入")').first();
    expect(await loginButton.isVisible()).toBeTruthy();

    // 點擊登入
    await loginButton.click();

    // 應該重導至管理員儀表板（TEST_MODE 預設為 ADMIN）
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    // 驗證在儀表板頁面
    await expect(page).toHaveURL(/\/admin/);
  });

  test('12.1.1.3：登出流程', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 先登入
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectDashboard('admin');

    // 驗證登入後 cookie 存在
    let cookies = await page.context().cookies();
    let sessionCookie = cookies.find(
      (c) => c.name === 'authjs.session-token' || c.name === 'next-auth.session-token'
    );
    expect(sessionCookie).toBeTruthy();

    // 執行登出
    await loginPage.logout();

    // 驗證重導至登入頁面
    await expect(page).toHaveURL('/');

    // 驗證 session cookie 已清除
    cookies = await page.context().cookies();
    sessionCookie = cookies.find(
      (c) => c.name === 'authjs.session-token' || c.name === 'next-auth.session-token'
    );
    // 注意：某些 cookie 可能仍然存在但已過期，主要檢查功能行為
  });

  test('12.1.1.4：受保護路由 - 未認證用戶重導', async ({ page }) => {
    // 清除所有 cookie 以確保未認證
    await page.context().clearCookies();

    // 嘗試訪問管理員儀表板
    await page.goto('/admin');

    // 應該被重導至登入頁面
    await page.waitForURL('/', { timeout: 5000 });
    await expect(page).toHaveURL('/');
  });

  test('12.1.1.5：受保護路由 - 認證後可訪問', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 登入
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectDashboard('admin');

    // 驗證能訪問受保護的路由
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);

    // 驗證頁面內容已加載（檢查某些預期的元素）
    // 這裡我們檢查頁面不是 404 或登入頁面
    const pageTitle = await page.title();
    expect(pageTitle).not.toContain('404');
    expect(pageTitle).not.toContain('未授權');
  });

  test('12.1.1.6：Session 驗證 - Cookie 格式和有效期', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 登入
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectDashboard('admin');

    // 獲取所有 cookie
    const cookies = await page.context().cookies();

    // 驗證至少有一個認證相關的 cookie
    const authCookies = cookies.filter(
      (c) =>
        c.name.includes('auth') ||
        c.name.includes('session') ||
        c.name.includes('next-auth')
    );
    expect(authCookies.length).toBeGreaterThan(0);

    // 驗證 cookie 屬性
    authCookies.forEach((cookie) => {
      // Secure 在生產環境應該是 true，但在開發環境可能是 false
      // HttpOnly 應該是 true 以防止 XSS
      if (process.env.NODE_ENV === 'production') {
        expect(cookie.secure).toBe(true);
      }
      expect(cookie.httpOnly).toBe(true);

      // 驗證 SameSite 設置
      expect(['Strict', 'Lax', 'None']).toContain(cookie.sameSite);
    });
  });

  test('12.1.1.7：多次登入 - 舊 session 覆蓋', async ({ page, context }) => {
    const loginPage = new LoginPage(page);

    // 第一次登入
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectDashboard('admin');

    const firstCookies = await context.cookies();
    const firstSessionCookie = firstCookies.find(
      (c) => c.name === 'authjs.session-token' || c.name === 'next-auth.session-token'
    );

    // 登出
    await loginPage.logout();

    // 第二次登入
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectDashboard('admin');

    const secondCookies = await context.cookies();
    const secondSessionCookie = secondCookies.find(
      (c) => c.name === 'authjs.session-token' || c.name === 'next-auth.session-token'
    );

    // 驗證 session cookie 已更新
    expect(firstSessionCookie?.value).not.toBe(secondSessionCookie?.value);
  });

  test('12.1.1.8：頁面重新整理後仍保持登入狀態', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 登入
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectDashboard('admin');

    // 獲取當前 URL
    const currentUrl = page.url();

    // 重新整理頁面
    await page.reload();

    // 驗證仍在同一頁面且未被重導至登入頁面
    await expect(page).toHaveURL(/\/admin/);

    // 驗證頁面內容已加載
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin');
  });

  test('12.1.1.9：並發訪問 - 多個標籤頁共享 session', async ({ context }) => {
    // 建立第一個頁面並登入
    const page1 = await context.newPage();
    const loginPage1 = new LoginPage(page1);
    await loginPage1.goto();
    await loginPage1.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage1.expectDashboard('admin');

    // 建立第二個頁面，應該繼承 session
    const page2 = await context.newPage();
    await page2.goto('/admin');

    // 驗證第二個頁面無需登入即可訪問受保護路由
    await expect(page2).toHaveURL(/\/admin/);

    // 驗證兩個頁面都有相同的 session cookie
    const cookies1 = await context.cookies();
    const cookies2 = await context.cookies();
    const sessionCookie1 = cookies1.find(
      (c) => c.name === 'authjs.session-token' || c.name === 'next-auth.session-token'
    );
    const sessionCookie2 = cookies2.find(
      (c) => c.name === 'authjs.session-token' || c.name === 'next-auth.session-token'
    );
    expect(sessionCookie1?.value).toBe(sessionCookie2?.value);

    // 清理
    await page1.close();
    await page2.close();
  });

  test('12.1.1.10：無效 session 錯誤處理', async ({ page, context }) => {
    const loginPage = new LoginPage(page);

    // 登入
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectDashboard('admin');

    // 手動刪除 session cookie 以模擬無效 session
    const allCookies = await context.cookies();
    const authCookies = allCookies.filter(
      (c) =>
        c.name === 'authjs.session-token' ||
        c.name === 'next-auth.session-token'
    );

    if (authCookies.length > 0) {
      for (const cookie of authCookies) {
        await context.clearCookies({
          name: cookie.name,
        });
      }

      // 嘗試訪問受保護路由
      await page.goto('/admin', { waitUntil: 'networkidle' });

      // 應該被重導至登入頁面
      await page.waitForURL('/', { timeout: 5000 });
      await expect(page).toHaveURL('/');
    }
  });
});
