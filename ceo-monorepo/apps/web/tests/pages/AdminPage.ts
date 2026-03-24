/**
 * 管理員儀表板 Page Object
 */
export class AdminPage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/admin');
  }

  async gotoOrders() {
    await this.page.goto('/admin/orders');
  }

  async gotoSupplierApplications() {
    await this.page.goto('/admin/supplier-applications');
  }

  async gotoAuditLogs() {
    await this.page.goto('/admin/audit-logs');
  }

  async getOrderCount() {
    await this.page.waitForLoadState('networkidle');
    const orders = this.page.locator('[data-testid="order-row"]');
    return await orders.count();
  }

  async getPendingOrderCount() {
    await this.page.waitForLoadState('networkidle');
    const pendingOrders = this.page.locator(
      '[data-testid="order-status"]:has-text("待審核")'
    );
    return await pendingOrders.count();
  }

  async approveFirstOrder() {
    const firstOrder = this.page.locator('[data-testid="order-row"]').first();
    if (await firstOrder.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOrder.click();
      await this.page.waitForURL(/\/admin\/orders\//, { timeout: 5000 });

      const approveButton = this.page.locator('button:has-text("批准")').first();
      if (await approveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await approveButton.click();
        await this.page.waitForTimeout(500);
        return true;
      }
    }
    return false;
  }

  async getNotificationCount() {
    const badge = this.page.locator('[data-testid="notification-badge"]');
    if (await badge.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await badge.textContent();
      return parseInt(text || '0');
    }
    return 0;
  }

  async openNotificationPanel() {
    const bell = this.page.locator('[data-testid="notification-bell"]');
    if (await bell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bell.click();
      const panel = this.page.locator('[data-testid="notification-panel"]');
      await panel.isVisible({ timeout: 2000 });
      return true;
    }
    return false;
  }

  async getNotifications() {
    const items = this.page.locator('[data-testid="notification-item"]');
    return await items.count();
  }
}
