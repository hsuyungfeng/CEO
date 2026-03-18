// 測試Mobile App API整合
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000';

async function testApiEndpoints() {
  console.log('測試Mobile App API整合...\n');

  // 1. 測試健康檢查
  console.log('1. 測試健康檢查API:');
  try {
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`   ✅ 狀態: ${healthData.status}`);
    console.log(`   ✅ 運行時間: ${Math.round(healthData.uptime)}秒`);
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  // 2. 測試商品列表API
  console.log('\n2. 測試商品列表API:');
  try {
    const productsResponse = await fetch(`${API_BASE_URL}/api/products?page=1&limit=3&sortBy=createdAt&order=desc`);
    const productsData = await productsResponse.json();
    console.log(`   ✅ 商品數量: ${productsData.data?.length || 0}`);
    console.log(`   ✅ 分頁資訊: 第${productsData.pagination?.page}頁，共${productsData.pagination?.totalPages}頁`);
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  // 3. 測試分類API
  console.log('\n3. 測試分類API:');
  try {
    const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`);
    const categoriesData = await categoriesResponse.json();
    console.log(`   ✅ 分類數量: ${categoriesData.length || 0}`);
    if (categoriesData.length > 0) {
      console.log(`   ✅ 頂級分類: ${categoriesData[0].name}`);
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  // 4. 測試熱門商品API
  console.log('\n4. 測試熱門商品API:');
  try {
    const featuredResponse = await fetch(`${API_BASE_URL}/api/products/featured`);
    const featuredData = await featuredResponse.json();
    console.log(`   ✅ 熱門商品數量: ${featuredData.length || 0}`);
    if (featuredData.length > 0) {
      console.log(`   ✅ 第一個熱門商品: ${featuredData[0].name}`);
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  // 5. 測試登入API（需要正確的憑證）
  console.log('\n5. 測試登入API:');
  try {
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taxId: '12345678',
        password: 'admin123'
      })
    });
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      console.log(`   ✅ 登入成功: ${loginData.message}`);
    } else {
      const errorData = await loginResponse.json();
      console.log(`   ⚠️ 登入失敗: ${errorData.error || '未知錯誤'}`);
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  console.log('\n✅ API整合測試完成！');
}

testApiEndpoints().catch(console.error);