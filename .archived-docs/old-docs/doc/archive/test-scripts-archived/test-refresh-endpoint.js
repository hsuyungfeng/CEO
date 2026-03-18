#!/usr/bin/env node

/**
 * Test script for /api/auth/refresh endpoint
 * 
 * Usage:
 * 1. First get a valid JWT token from /api/auth/login
 * 2. Run: node test-refresh-endpoint.js <your-token>
 */

const fetch = require('node-fetch');

async function testRefreshEndpoint(token) {
  if (!token) {
    console.error('請提供有效的 JWT token');
    console.log('使用方法: node test-refresh-endpoint.js <your-jwt-token>');
    console.log('例如: node test-refresh-endpoint.js eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiUnpzM1BLUWdJa3RxaDVLZmd0WktxOWFrVmFabDFWeWswdS1lby1ONmEwSFNwM2hybFhnZW1ZZXY3R3JxYV84dFFLcXgtVkdnaWg3Q3h3TU9SaTlUMkEifQ...');
    process.exit(1);
  }

  const url = 'http://localhost:3000/api/auth/refresh';
  
  console.log('測試 Token 刷新端點...');
  console.log('URL:', url);
  console.log('使用 Token:', token.substring(0, 50) + '...');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('\n回應狀態:', response.status);
    console.log('回應內容:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Token 刷新成功!');
      console.log('新 Token 長度:', data.token?.length || 0);
      console.log('新 Token 過期時間:', data.expiresAt);
      
      // 驗證新 token 是否有效
      if (data.token) {
        console.log('\n測試新 Token 是否有效...');
        const testResponse = await fetch('http://localhost:3000/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });
        
        const testData = await testResponse.json();
        console.log('新 Token 驗證狀態:', testResponse.status);
        if (testResponse.ok) {
          console.log('✅ 新 Token 有效!');
        } else {
          console.log('❌ 新 Token 無效:', testData.error);
        }
      }
    } else {
      console.log('\n❌ Token 刷新失敗:', data.error);
    }
    
  } catch (error) {
    console.error('\n❌ 請求失敗:', error.message);
    console.log('請確保:');
    console.log('1. 伺服器正在運行 (npm run dev)');
    console.log('2. 使用有效的 JWT token');
    console.log('3. 檢查網路連接');
  }
}

// 從命令行參數獲取 token
const token = process.argv[2];
testRefreshEndpoint(token);