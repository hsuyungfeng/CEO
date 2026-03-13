const fetch = require('node-fetch');

async function testAdminAccess() {
  console.log('🚀 測試管理員後台訪問流程');
  console.log('==============================\n');

  // 1. 登入
  console.log('1. 🔐 登入管理員帳號...');
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taxId: '12345678',
      password: 'Admin1234!',
      rememberMe: false,
    }),
  });

  const loginData = await loginResponse.json();
  
  if (!loginResponse.ok) {
    console.log(`❌ 登入失敗: ${loginData.error}`);
    return;
  }

  console.log('✅ 登入成功!');
  console.log(`   用戶: ${loginData.user?.name} (${loginData.user?.role})`);

  // 獲取 cookie
  const cookies = loginResponse.headers.get('set-cookie');
  console.log(`   Cookie 已設置: ${cookies ? '是' : '否'}`);

  // 2. 測試 /api/auth/me
  console.log('\n2. 🔍 測試 /api/auth/me 端點...');
  const meResponse = await fetch('http://localhost:3000/api/auth/me', {
    headers: {
      'Cookie': cookies || '',
    },
  });

  const meData = await meResponse.json();
  
  if (meResponse.ok) {
    console.log('✅ /api/auth/me 訪問成功');
    console.log(`   用戶角色: ${meData.user?.role}`);
  } else {
    console.log(`❌ /api/auth/me 訪問失敗: ${meData.error}`);
  }

  // 3. 測試管理員 API
  console.log('\n3. 🛡️  測試管理員 API (/api/admin/dashboard)...');
  const adminResponse = await fetch('http://localhost:3000/api/admin/dashboard', {
    headers: {
      'Cookie': cookies || '',
    },
  });

  const adminData = await adminResponse.json();
  
  if (adminResponse.ok) {
    console.log('✅ 管理員 API 訪問成功');
    console.log(`   數據: ${JSON.stringify(adminData.data, null, 2)}`);
  } else {
    console.log(`❌ 管理員 API 訪問失敗: ${adminData.error}`);
  }

  // 4. 測試管理員頁面訪問
  console.log('\n4. 🌐 測試管理員頁面訪問...');
  const pageResponse = await fetch('http://localhost:3000/admin', {
    headers: {
      'Cookie': cookies || '',
    },
  });

  const pageText = await pageResponse.text();
  const hasAdminContent = pageText.includes('AdminDashboard') || pageText.includes('管理員');
  
  if (pageResponse.ok && hasAdminContent) {
    console.log('✅ 管理員頁面訪問成功');
    console.log(`   頁面標題: ${pageText.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || '未找到'}`);
  } else {
    console.log(`❌ 管理員頁面訪問失敗`);
    console.log(`   狀態碼: ${pageResponse.status}`);
    console.log(`   頁面包含 "管理員": ${hasAdminContent ? '是' : '否'}`);
  }

  // 5. 測試會員管理頁面
  console.log('\n5. 👥 測試會員管理頁面 (/admin/members)...');
  const membersResponse = await fetch('http://localhost:3000/admin/members', {
    headers: {
      'Cookie': cookies || '',
    },
  });

  const membersText = await membersResponse.text();
  const hasMembersContent = membersText.includes('members') || membersText.includes('會員');
  
  if (membersResponse.ok && hasMembersContent) {
    console.log('✅ 會員管理頁面訪問成功');
  } else {
    console.log(`❌ 會員管理頁面訪問失敗`);
    console.log(`   狀態碼: ${membersResponse.status}`);
  }

  console.log('\n📊 測試結果總結:');
  console.log(`   ✅ 登入: ${loginResponse.ok ? '成功' : '失敗'}`);
  console.log(`   ✅ /api/auth/me: ${meResponse.ok ? '成功' : '失敗'}`);
  console.log(`   ✅ 管理員 API: ${adminResponse.ok ? '成功' : '失敗'}`);
  console.log(`   ✅ 管理員頁面: ${pageResponse.ok && hasAdminContent ? '成功' : '失敗'}`);
  console.log(`   ✅ 會員管理頁面: ${membersResponse.ok && hasMembersContent ? '成功' : '失敗'}`);

  if (loginResponse.ok && meResponse.ok && adminResponse.ok && pageResponse.ok && membersResponse.ok) {
    console.log('\n🎉 所有測試通過！管理員後台可正常訪問。');
    console.log('\n💡 訪問以下網址:');
    console.log('   - 管理員儀表板: http://localhost:3000/admin');
    console.log('   - 會員管理: http://localhost:3000/admin/members');
    console.log('   - 商品管理: http://localhost:3000/admin/products');
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查:');
    console.log('   1. NextAuth session 配置');
    console.log('   2. Cookie 設置');
    console.log('   3. 管理員權限檢查邏輯');
  }
}

// 執行測試
testAdminAccess().catch(console.error);