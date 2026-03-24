import { test as base, expect } from '@playwright/test';

/**
 * 測試認證用戶資料
 */
export const TEST_USERS = {
  admin: {
    username: '12345678', // 8位數字統一編號
    password: 'test-password-admin',
    role: 'ADMIN',
  },
  supplier: {
    username: '87654321',
    password: 'test-password-supplier',
    role: 'SUPPLIER',
  },
  member: {
    username: '11111111',
    password: 'test-password-member',
    role: 'MEMBER',
  },
};

/**
 * 登入頁面 Page Object
 */
export class LoginPage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.page.goto('/');
    // 由於 TEST_MODE=true，直接點擊登入會以 ADMIN 身份登入
    // 如果需要特定用戶，可能需要 API 登入或其他方式
    const loginButton = this.page.locator('button:has-text("登入")').first();

    // 如果有登入表單，填寫用戶名和密碼
    const usernameInput = this.page.locator('input[type="text"]').first();
    const passwordInput = this.page.locator('input[type="password"]').first();

    if (await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usernameInput.fill(username);
      await passwordInput.fill(password);
      await this.page.locator('button:has-text("登入")').click();
    } else {
      // 如果是 TEST_MODE，直接點擊登入按鈕
      await loginButton.click();
    }

    // 等待重導至儀表板
    await this.page.waitForURL(/\/(admin|supplier|dashboard)/, { timeout: 10000 });
  }

  async logout() {
    // 點擊使用者菜單
    const userMenuButton = this.page.locator('[aria-label="使用者菜單"]').first();
    if (await userMenuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenuButton.click();
    }

    // 點擊登出按鈕
    const logoutButton = this.page.locator('button:has-text("登出")').first();
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
    }

    // 等待重導至登入頁面
    await this.page.waitForURL('/');
  }

  async expectLoginPage() {
    await expect(this.page).toHaveURL('/');
  }

  async expectDashboard(role: string = 'admin') {
    const expectedUrls = {
      admin: /\/admin/,
      supplier: /\/supplier/,
      member: /\/dashboard/,
    };
    await expect(this.page).toHaveURL(expectedUrls[role as keyof typeof expectedUrls] || /\/(admin|supplier|dashboard)/);
  }
}

/**
 * 帶有認證的 Page Fixture
 */
export const test = base.extend({
  authenticatedAdminPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await use(page);
    // 清理：登出
    try {
      await loginPage.logout();
    } catch (e) {
      // 忽略登出錯誤
    }
  },

  authenticatedSupplierPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(TEST_USERS.supplier.username, TEST_USERS.supplier.password);
    await use(page);
    // 清理：登出
    try {
      await loginPage.logout();
    } catch (e) {
      // 忽略登出錯誤
    }
  },

  authenticatedMemberPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(TEST_USERS.member.username, TEST_USERS.member.password);
    await use(page);
    // 清理：登出
    try {
      await loginPage.logout();
    } catch (e) {
      // 忽略登出錯誤
    }
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect };
