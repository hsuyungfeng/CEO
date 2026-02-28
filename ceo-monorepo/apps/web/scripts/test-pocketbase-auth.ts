#!/usr/bin/env npx ts-node

/**
 * Phase 2.3 認證層測試腳本
 * 用途：驗證 PocketBase 認證函數是否正確工作
 * 執行方式：npx ts-node scripts/test-pocketbase-auth.ts
 */

import {
  findUserByTaxId,
  findUserByEmail,
  findUserById,
  verifyPassword,
  isUserActive,
  createUser,
  createOAuthAccount,
  findOAuthAccount,
} from '@/lib/pocketbase-auth';

// 測試用資料
const TEST_USER = {
  taxId: '12345678',
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  firmName: 'Test Company',
  role: 'MEMBER' as const,
  status: 'ACTIVE' as const,
};

const TEST_OAUTH = {
  provider: 'google' as const,
  providerId: 'google_12345',
  email: 'oauth@example.com',
  name: 'OAuth Test User',
  accessToken: 'test_access_token_12345',
};

// 彩色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(type: 'success' | 'error' | 'info' | 'test', message: string) {
  const symbols = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    test: '🧪',
  };

  const colorMap = {
    success: colors.green,
    error: colors.red,
    info: colors.blue,
    test: colors.yellow,
  };

  console.log(`${colorMap[type]}${symbols[type]} ${message}${colors.reset}`);
}

async function testPocketBaseAuth() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Phase 2.3 認證層測試開始');
  console.log('='.repeat(60) + '\n');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // 測試 1: 檢查 PocketBase 連接
    log('test', '測試 1: 檢查 PocketBase 連接...');
    try {
      const testConnection = await findUserByTaxId('test_connection_check_12345');
      log('success', '✓ PocketBase 連接成功 (可以查詢集合)');
      testsPassed++;
    } catch (error) {
      log(
        'error',
        `✗ PocketBase 連接失敗: ${(error as any)?.message || '未知錯誤'}`
      );
      log(
        'info',
        '確保 PocketBase 正在運行：pocketbase serve 並且已建立 users 集合'
      );
      testsFailed++;
      return; // 若連接失敗，無法繼續其他測試
    }

    // 測試 2: 建立測試用戶
    log('test', '測試 2: 建立測試用戶...');
    try {
      const newUser = await createUser({
        taxId: TEST_USER.taxId,
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: TEST_USER.name,
        firmName: TEST_USER.firmName,
        role: TEST_USER.role,
        status: TEST_USER.status,
        emailVerified: false,
      });
      log('success', `✓ 用戶已建立 (ID: ${newUser.id})`);
      testsPassed++;

      // 保存用戶 ID 供後續測試使用
      const createdUserId = newUser.id;

      // 測試 3: 根據 taxId 查找用戶
      log('test', '測試 3: 根據 taxId 查找用戶...');
      const userByTaxId = await findUserByTaxId(TEST_USER.taxId);
      if (userByTaxId && userByTaxId.taxId === TEST_USER.taxId) {
        log('success', `✓ 找到用戶 (taxId: ${userByTaxId.taxId})`);
        testsPassed++;
      } else {
        log('error', '✗ 未能根據 taxId 找到用戶');
        testsFailed++;
      }

      // 測試 4: 根據 email 查找用戶
      log('test', '測試 4: 根據 email 查找用戶...');
      const userByEmail = await findUserByEmail(TEST_USER.email);
      if (userByEmail && userByEmail.email === TEST_USER.email) {
        log('success', `✓ 找到用戶 (email: ${userByEmail.email})`);
        testsPassed++;
      } else {
        log('error', '✗ 未能根據 email 找到用戶');
        testsFailed++;
      }

      // 測試 5: 根據 ID 查找用戶
      log('test', '測試 5: 根據 ID 查找用戶...');
      const userById = await findUserById(createdUserId);
      if (userById && userById.id === createdUserId) {
        log('success', `✓ 找到用戶 (ID: ${userById.id})`);
        testsPassed++;
      } else {
        log('error', '✗ 未能根據 ID 找到用戶');
        testsFailed++;
      }

      // 測試 6: 驗證密碼
      log('test', '測試 6: 驗證用戶密碼...');
      if (userByTaxId) {
        const isPasswordValid = await verifyPassword(
          userByTaxId,
          TEST_USER.password
        );
        if (isPasswordValid) {
          log('success', '✓ 密碼驗證成功');
          testsPassed++;
        } else {
          log('error', '✗ 密碼驗證失敗 (密碼不匹配)');
          testsFailed++;
        }

        // 測試 6b: 驗證錯誤密碼
        log('test', '測試 6b: 驗證錯誤密碼應被拒絕...');
        const isInvalidPassword = await verifyPassword(
          userByTaxId,
          'WrongPassword123!'
        );
        if (!isInvalidPassword) {
          log('success', '✓ 錯誤密碼被正確拒絕');
          testsPassed++;
        } else {
          log('error', '✗ 錯誤密碼未被拒絕 (安全風險!)');
          testsFailed++;
        }
      }

      // 測試 7: 檢查用戶狀態
      log('test', '測試 7: 檢查用戶狀態 (ACTIVE)...');
      if (userByTaxId && isUserActive(userByTaxId)) {
        log('success', '✓ 用戶狀態為 ACTIVE');
        testsPassed++;
      } else {
        log('error', '✗ 用戶狀態檢查失敗');
        testsFailed++;
      }

      // 測試 8: 建立 OAuth 帳戶
      log('test', '測試 8: 建立 OAuth 帳戶 (Google)...');
      try {
        const oauthAccount = await createOAuthAccount(
          createdUserId,
          TEST_OAUTH.provider,
          TEST_OAUTH.providerId,
          {
            email: TEST_OAUTH.email,
            name: TEST_OAUTH.name,
            accessToken: TEST_OAUTH.accessToken,
          }
        );
        log('success', `✓ OAuth 帳戶已建立 (ID: ${oauthAccount.id})`);
        testsPassed++;

        // 測試 9: 查找 OAuth 帳戶
        log('test', '測試 9: 根據 provider 和 providerId 查找 OAuth 帳戶...');
        const foundOAuthAccount = await findOAuthAccount(
          TEST_OAUTH.provider,
          TEST_OAUTH.providerId
        );
        if (foundOAuthAccount) {
          log(
            'success',
            `✓ 找到 OAuth 帳戶 (providerId: ${foundOAuthAccount.account.providerId})`
          );
          testsPassed++;
        } else {
          log('error', '✗ 未能找到 OAuth 帳戶');
          testsFailed++;
        }
      } catch (error) {
        log(
          'error',
          `✗ OAuth 帳戶建立失敗: ${(error as any)?.message}`
        );
        testsFailed += 2;
      }
    } catch (error) {
      log('error', `✗ 用戶建立失敗: ${(error as any)?.message}`);
      log('info', '如果是 "duplicate" 錯誤，說明測試用戶已存在，可以跳過建立步驟');
      testsFailed++;

      // 嘗試使用現有用戶進行後續測試
      log('info', '嘗試使用現有測試用戶進行驗證...');
      const existingUser = await findUserByTaxId(TEST_USER.taxId);
      if (existingUser) {
        log('success', '✓ 找到現有測試用戶');
        testsPassed++;

        const isPasswordValid = await verifyPassword(
          existingUser,
          TEST_USER.password
        );
        if (isPasswordValid) {
          log('success', '✓ 密碼驗證成功');
          testsPassed++;
        } else {
          log('error', '✗ 密碼驗證失敗');
          testsFailed++;
        }

        if (isUserActive(existingUser)) {
          log('success', '✓ 用戶狀態為 ACTIVE');
          testsPassed++;
        }
      }
    }
  } catch (error) {
    log('error', `✗ 測試執行失敗: ${error}`);
    testsFailed++;
  }

  // 總結結果
  console.log('\n' + '='.repeat(60));
  console.log('📊 測試結果摘要');
  console.log('='.repeat(60));
  console.log(`${colors.green}✅ 通過: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}❌ 失敗: ${testsFailed}${colors.reset}`);
  console.log(`${'總計'}: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log(
      `\n${colors.green}🎉 所有測試通過！可以進行 Phase 2.4${colors.reset}\n`
    );
    process.exit(0);
  } else {
    console.log(
      `\n${colors.red}⚠️  某些測試失敗，請檢查上述錯誤信息${colors.reset}\n`
    );
    process.exit(1);
  }
}

// 執行測試
testPocketBaseAuth().catch((error) => {
  console.error('測試執行異常:', error);
  process.exit(1);
});
