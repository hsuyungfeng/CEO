#!/usr/bin/env node
/**
 * 速率限制測試腳本
 * 測試 API 速率限制功能是否正常
 */

const http = require('http');

const API_URL = 'http://localhost:3002/api/search?q=test';
const MAX_REQUESTS = 110; // 超過限制 100
const CONCURRENT = 5;

let successCount = 0;
let rateLimitCount = 0;
let errorCount = 0;

function makeRequest(index) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.get(API_URL, (res) => {
      const duration = Date.now() - startTime;
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 429) {
          rateLimitCount++;
          console.log(`請求 ${index}: 429 速率限制 (${duration}ms)`);
          if (data) {
            try {
              const json = JSON.parse(data);
              console.log(`  限制: ${json.limit}, 重試時間: ${json.retryAfter}秒`);
            } catch (e) {}
          }
        } else if (res.statusCode === 200) {
          successCount++;
          console.log(`請求 ${index}: 200 成功 (${duration}ms)`);
        } else {
          errorCount++;
          console.log(`請求 ${index}: ${res.statusCode} 錯誤 (${duration}ms)`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      errorCount++;
      console.log(`請求 ${index}: 錯誤 - ${err.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      errorCount++;
      console.log(`請求 ${index}: 超時`);
      resolve();
    });
  });
}

async function runTest() {
  console.log('開始速率限制測試...');
  console.log(`目標 API: ${API_URL}`);
  console.log(`請求數量: ${MAX_REQUESTS}`);
  console.log('---');

  const promises = [];
  for (let i = 1; i <= MAX_REQUESTS; i++) {
    promises.push(makeRequest(i));
    
    // 控制併發數
    if (promises.length >= CONCURRENT) {
      await Promise.all(promises);
      promises.length = 0;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 等待剩餘請求
  if (promises.length > 0) {
    await Promise.all(promises);
  }

  console.log('---');
  console.log('測試完成');
  console.log(`成功: ${successCount}`);
  console.log(`速率限制: ${rateLimitCount}`);
  console.log(`錯誤: ${errorCount}`);
  
  if (rateLimitCount > 0) {
    console.log('✅ 速率限制功能正常運作');
  } else {
    console.log('⚠️  未觸發速率限制，可能需要檢查配置');
  }
}

runTest().catch(console.error);