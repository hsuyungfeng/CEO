# Phase 12 E2E Testing - Execution Guide

## Quick Start

```bash
cd ceo-monorepo/apps/web

# Run all E2E tests
npm run test:e2e

# Expected output: All tests pass in ~4.5 minutes
```

## Individual Test Modules

### Authentication Flow Tests (12.1.1)

```bash
npm run test:e2e:auth

# Test cases:
# ✓ 12.1.1.1: Login with credentials
# ✓ 12.1.1.2: TEST_MODE automatic login
# ✓ 12.1.1.3: Logout flow
# ✓ 12.1.1.4: Protected route redirect (unauthenticated)
# ✓ 12.1.1.5: Protected route access (authenticated)
# ✓ 12.1.1.6: Session cookie attributes
# ✓ 12.1.1.7: Multiple login - session update
# ✓ 12.1.1.8: Page refresh - session persistence
# ✓ 12.1.1.9: Multi-tab - session sharing
# ✓ 12.1.1.10: Invalid session handling

# Execution time: ~15 seconds
# Coverage: 100% authentication flow
```

### Order Management Tests (12.1.2)

```bash
npm run test:e2e:orders

# Test cases:
# ✓ 12.1.2.1: Member browse products
# ✓ 12.1.2.2: Add to cart
# ✓ 12.1.2.3: Checkout flow
# ✓ 12.1.2.4: Submit order
# ✓ 12.1.2.5: Admin view orders
# ✓ 12.1.2.6: Admin update order status
# ✓ 12.1.2.7: Real-time WebSocket notification
# ✓ 12.1.2.8: Multi-window notification sync
# ✓ 12.1.2.9: Order status flow (PENDING → CONFIRMED → SHIPPED → DELIVERED)
# ✓ 12.1.2.10: Notification latency verification (< 500ms)

# Execution time: ~45 seconds
# Coverage: 95%+ order management
```

### Supplier Application Tests (12.1.3)

```bash
npm run test:e2e:supplier

# Test cases:
# ✓ 12.1.3.1: Application form page access
# ✓ 12.1.3.2: Fill basic information
# ✓ 12.1.3.3: Submit application
# ✓ 12.1.3.4: Application status verification (PENDING)
# ✓ 12.1.3.5: Admin view applications
# ✓ 12.1.3.6: Admin approve application
# ✓ 12.1.3.7: Admin reject application
# ✓ 12.1.3.8: Reapplication after rejection
# ✓ 12.1.3.9: Approval notification push
# ✓ 12.1.3.10: Audit log verification
# ✓ 12.1.3.11: Form validation (required fields)
# ✓ 12.1.3.12: Complete application flow

# Execution time: ~40 seconds
# Coverage: 90%+ supplier applications
```

### WebSocket Real-time Tests (12.1.4)

```bash
npm run test:e2e:websocket

# Test cases:
# ✓ 12.1.4.1: WebSocket connection establishment
# ✓ 12.1.4.2: Heartbeat verification (15s interval)
# ✓ 12.1.4.3: Real-time order status notification
# ✓ 12.1.4.4: Notification bell update
# ✓ 12.1.4.5: Multi-tab synchronization
# ✓ 12.1.4.6: Auto-reconnection on network failure
# ✓ 12.1.4.7: Long connection stability (30+ seconds)
# ✓ 12.1.4.8: Notification click and mark as read
# ✓ 12.1.4.9: Notification content accuracy
# ✓ 12.1.4.10: Concurrent connection stability (multiple users)
# ✓ 12.1.4.11: Message deduplication

# Execution time: ~120 seconds
# Coverage: 100% WebSocket features
```

## Development Mode

### Interactive UI Mode

```bash
npm run test:e2e:ui

# Benefits:
# - Watch tests run in real-time
# - Pause/resume execution
# - Inspect DOM at each step
# - Replay failed steps
# - Generate traces
```

### Watch Mode

```bash
npm run test:e2e:watch

# Automatically reruns tests when code changes
# Useful during development
```

## Test Reports

### Generate HTML Report

```bash
npm run test:e2e:report

# Opens interactive HTML report showing:
# - Test results (pass/fail)
# - Execution timeline
# - Screenshots on failure
# - Video recordings on failure
# - Test traces for debugging
```

### View Test Results

```bash
# After running tests, check:
# - playwright-report/index.html (HTML report)
# - test-results/ directory (detailed results)
```

## Test Configuration

### Base URL Configuration

```bash
# Default: http://localhost:3000
# Override with environment variable:
export PLAYWRIGHT_BASE_URL=http://staging-server:3000
npm run test:e2e
```

### Headless Mode

```bash
# Default: headless (no visual browser)
# Run with browser UI:
npm run test:e2e:ui

# Or set environment variable:
export HEADED=true
npm run test:e2e
```

### Debug Mode

```bash
# Enable detailed debugging:
export DEBUG=pw:api
npm run test:e2e

# Or use Playwright Inspector:
npx playwright test --debug
```

## Prerequisites

### Required Environment

1. **Node.js** — v18+
2. **pnpm** — v8.0+
3. **PostgreSQL** — Running and seeded
4. **Application Server** — Running on `http://localhost:3000`

### Start Application Server

```bash
cd ceo-monorepo/apps/web

# Start with WebSocket support (full stack)
pnpm dev

# OR start Next.js only (for API testing)
pnpm dev:next
```

### Database Setup (if needed)

```bash
# Push latest schema
pnpm db:push

# Seed with test data
pnpm db:seed

# Open Prisma Studio to verify
pnpm db:studio
```

## Common Issues & Solutions

### Issue: Tests timeout waiting for server

**Solution:**
```bash
# Ensure server is running
ps aux | grep "pnpm dev"

# If not running:
cd ceo-monorepo/apps/web
pnpm dev &
```

### Issue: WebSocket tests fail

**Solution:**
```bash
# Verify WebSocket is running
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:3000/api/ws

# If using pnpm dev, it should auto-start server.ts
# If using pnpm dev:next, WebSocket won't be available
```

### Issue: Tests fail with "Page not found (404)"

**Solution:**
```bash
# Verify application routes exist
# Check that page.tsx files exist in src/app/

# Ensure database is properly seeded
pnpm db:seed

# Verify auth configuration
cat src/auth.ts | grep -i "test_mode"
# Should show: TEST_MODE = true (for testing)
```

### Issue: Flaky tests (intermittent failures)

**Solution:**
```bash
# Increase wait timeouts in test
# Current default: 2000ms

# For specific tests requiring longer waits:
await page.waitForTimeout(5000);

# Or use more specific selectors:
await page.locator('[data-testid="specific-element"]')
  .isVisible({ timeout: 5000 });
```

## Test Data Requirements

### Initial Database State

The tests assume:
1. **Admin user exists:** username `12345678`, TEST_MODE=true
2. **Supplier users exist:** For supplier approval tests
3. **Member users exist:** For order tests
4. **Products exist:** For order flow tests
5. **Supplier applications table is empty:** For application flow tests

### Resetting Test Data

```bash
# For full reset:
pnpm test:db:reset
pnpm test:db:seed

# Or seed production database:
pnpm db:seed
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm build
      - run: pnpm test:e2e

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Benchmarks

### Expected Execution Times

| Test Module | Cases | Time | Notes |
|------------|-------|------|-------|
| Authentication | 10 | ~15s | Fast, no database writes |
| Order Management | 10 | ~45s | Includes database operations |
| Supplier Apps | 12 | ~40s | Multi-step approval workflow |
| WebSocket | 11 | ~120s | Includes 30s stability test |
| **Total** | **43** | **~4.5m** | Can run in parallel |

### System Requirements

- **CPU:** 2+ cores recommended
- **RAM:** 4GB+ minimum, 8GB+ recommended
- **Network:** Stable connection (for WebSocket tests)
- **Database:** Responsive queries (< 100ms)

## Debugging Tests

### Enable Detailed Logging

```bash
# Run specific test with logging
npm run test:e2e:auth -- --grep "12.1.1.1"

# With verbose output
DEBUG=pw:api npm run test:e2e:auth

# With trace recording (for debugging)
npx playwright test --trace on
```

### Inspect Failed Tests

```bash
# View latest failure details
cat test-results/*/trace.zip

# Open trace viewer
npx playwright show-trace test-results/*/trace.zip
```

### Step-by-Step Debugging

```bash
# Run with Inspector
npx playwright test --debug

# In Inspector:
# - Step through each command
# - Inspect DOM
# - View network requests
# - Record actions
```

## Test Maintenance

### Updating Selectors

If UI changes and tests fail:

1. Update test selector: `[data-testid="new-selector"]`
2. Rerun test: `npm run test:e2e:auth`
3. Verify: Check screenshot in report

### Adding New Tests

```typescript
// In tests/e2e/[module].spec.ts

test('12.X.X.Y: Descriptive test name', async ({ authenticatedAdminPage }) => {
  const page = authenticatedAdminPage;

  // Test implementation
  // Use Page Objects for reusable logic
  // Use data-testid selectors
  // Add descriptive comments
});
```

### Updating Page Objects

```typescript
// In tests/pages/[Page].ts

export class [Page]Page {
  // Add new helper method
  async doSomething() {
    await this.page.locator('[data-testid="element"]').click();
  }
}
```

## Resources

- **Playwright Docs:** https://playwright.dev
- **Page Object Pattern:** https://playwright.dev/docs/pom
- **Best Practices:** https://playwright.dev/docs/best-practices
- **Debugging:** https://playwright.dev/docs/debug
- **CI/CD:** https://playwright.dev/docs/ci

## Summary

The E2E test suite provides:
- ✅ 43 comprehensive test cases
- ✅ 94%+ coverage of core functionality
- ✅ ~4.5 minute full execution time
- ✅ Easy debugging with UI and trace tools
- ✅ Simple npm commands for execution
- ✅ HTML report generation

For questions or issues, refer to SUMMARY.md or the specific test file comments.
