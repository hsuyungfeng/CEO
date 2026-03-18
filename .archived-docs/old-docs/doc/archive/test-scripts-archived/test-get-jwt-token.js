// 測試取得 JWT Token 的方法
const https = require('https');

const API_BASE = 'http://localhost:3000';
const TEST_USER_TAX_ID = '12345678';
const TEST_USER_PASSWORD = 'admin123';

async function testGetJWTToken() {
  console.log('測試取得 JWT Token 的方法');
  console.log('====================================\n');

  // 1. 嘗試直接呼叫 NextAuth 的 session 端點
  console.log('1. 嘗試呼叫 NextAuth session 端點...');
  try {
    const sessionResponse = await fetch(`${API_BASE}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const sessionData = await sessionResponse.json();
    console.log('Session 端點回應:', JSON.stringify(sessionData, null, 2));
  } catch (error) {
    console.log('Session 端點錯誤:', error.message);
  }

  console.log('\n2. 檢查 NextAuth 的 JWT 設定...');
  console.log('根據 auth.ts 設定:');
  console.log('- strategy: "jwt"');
  console.log('- maxAge: 30天');
  console.log('- JWT callback 會將使用者資料加入 token');
  
  console.log('\n3. 問題分析:');
  console.log('a) 登入 API (/api/auth/login) 使用 NextAuth 的 signIn()');
  console.log('b) signIn() 會建立 session 和 JWT token');
  console.log('c) 但登入 API 只返回 session cookie，不返回 JWT token');
  console.log('d) Mobile App 需要 Bearer Token (JWT)，不是 session cookie');
  
  console.log('\n4. 可能的解決方案:');
  console.log('方案 A: 修改登入 API 返回 JWT token');
  console.log('   - 在登入成功後，取得 NextAuth 產生的 JWT token');
  console.log('   - 將 token 包含在登入回應中');
  console.log('   - Mobile App 儲存此 token 用於後續請求');
  
  console.log('\n方案 B: 新增專門的 token 端點');
  console.log('   - 新增 /api/auth/token 端點');
  console.log('   - 接受憑證並返回 JWT token');
  console.log('   - 類似登入 API 但只返回 token');
  
  console.log('\n方案 C: 使用 NextAuth 的 getToken()');
  console.log('   - 在登入後，使用 getToken() 取得 JWT');
  console.log('   - 需要存取 request 物件');
  
  console.log('\n5. 檢查現有程式碼中的 token 處理:');
  console.log('在 /api/user/profile/route.ts 中:');
  console.log('- 使用 getToken() 驗證 Bearer Token');
  console.log('- 需要 NEXTAUTH_SECRET 來驗證 token');
  console.log('- 表示系統支援 JWT token 驗證');
  console.log('- 但缺少取得 token 的端點');
}

// 由於 fetch 可能不可用，使用簡單的 http 請求
const http = require('http');

function simpleRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('測試 Mobile App 認證流程問題');
  console.log('===============================\n');
  
  // 測試登入
  console.log('測試登入 API...');
  const loginResponse = await simpleRequest(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      taxId: TEST_USER_TAX_ID,
      password: TEST_USER_PASSWORD,
      rememberMe: false
    })
  });
  
  console.log('狀態碼:', loginResponse.status);
  console.log('回應標頭中的 Set-Cookie:', loginResponse.headers['set-cookie']);
  
  try {
    const body = JSON.parse(loginResponse.body);
    console.log('回應主體:', JSON.stringify(body, null, 2));
    
    // 檢查是否有 token
    if (body.token || body.accessToken || body.jwt) {
      console.log('\n✅ 找到 token:', body.token || body.accessToken || body.jwt);
    } else {
      console.log('\n❌ 登入回應中沒有 token');
      console.log('只有使用者資料，沒有 JWT token');
    }
  } catch (e) {
    console.log('解析回應錯誤:', e.message);
  }
  
  console.log('\n結論:');
  console.log('1. 登入 API 目前不返回 JWT token');
  console.log('2. Mobile App 無法取得 Bearer Token 進行驗證');
  console.log('3. 需要修改登入 API 或新增 token 端點');
}

// 執行測試
runTests().catch(console.error);