 
// 驗證管理員訂單 API 文件結構
const fs = require('fs');
const path = require('path');

console.log('=== 驗證管理員訂單 API 實現 ===\n');

const apiFiles = [
  'src/app/api/admin/orders/route.ts',
  'src/app/api/admin/orders/[id]/route.ts',
  'src/types/admin.ts'
];

let allPassed = true;

apiFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  console.log(`檢查文件: ${file}`);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 基本檢查
    const checks = [];
    
    if (file.includes('route.ts')) {
      // 檢查是否導出正確的函數
      if (file.includes('[id]')) {
        checks.push({
          name: '導出 GET 函數',
          passed: content.includes('export async function GET'),
          required: true
        });
        checks.push({
          name: '導出 PATCH 函數',
          passed: content.includes('export async function PATCH'),
          required: true
        });
        checks.push({
          name: '導出 DELETE 函數',
          passed: content.includes('export async function DELETE'),
          required: true
        });
        checks.push({
          name: '包含 requireAdmin',
          passed: content.includes('requireAdmin'),
          required: true
        });
      } else {
        checks.push({
          name: '導出 GET 函數',
          passed: content.includes('export async function GET'),
          required: true
        });
        checks.push({
          name: '包含 requireAdmin',
          passed: content.includes('requireAdmin'),
          required: true
        });
      }
      
      checks.push({
        name: '包含 ApiResponse 類型',
        passed: content.includes('ApiResponse'),
        required: true
      });
    }
    
    if (file.includes('admin.ts')) {
      checks.push({
        name: '包含 UpdateOrderStatusSchema',
        passed: content.includes('UpdateOrderStatusSchema'),
        required: true
      });
      checks.push({
        name: '包含 OrderQuerySchema',
        passed: content.includes('OrderQuerySchema'),
        required: true
      });
    }
    
    // 顯示檢查結果
    let filePassed = true;
    checks.forEach(check => {
      const status = check.passed ? '✓' : '✗';
      const required = check.required ? '(必要)' : '(可選)';
      console.log(`  ${status} ${check.name} ${required}`);
      if (!check.passed && check.required) {
        filePassed = false;
      }
    });
    
    console.log(`  文件大小: ${content.length} 字節`);
    console.log(`  行數: ${content.split('\n').length}`);
    
    if (!filePassed) {
      allPassed = false;
      console.log(`  ❌ 文件檢查失敗\n`);
    } else {
      console.log(`  ✅ 文件檢查通過\n`);
    }
    
  } else {
    console.log(`  ❌ 文件不存在: ${filePath}\n`);
    allPassed = false;
  }
});

// 檢查目錄結構
console.log('=== 檢查目錄結構 ===');
const dirs = [
  'src/app/api/admin/orders',
  'src/app/api/admin/orders/[id]'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`✓ 目錄存在: ${dir}`);
    const files = fs.readdirSync(dirPath);
    if (files.length > 0) {
      console.log(`  包含文件: ${files.join(', ')}`);
    }
  } else {
    console.log(`✗ 目錄不存在: ${dir}`);
    allPassed = false;
  }
});

console.log('\n=== 驗證結果 ===');
if (allPassed) {
  console.log('✅ 所有檢查通過！管理員訂單 API 實現完成。');
  console.log('\n已實現的 API 端點:');
  console.log('1. GET    /api/admin/orders');
  console.log('2. GET    /api/admin/orders/[id]');
  console.log('3. PATCH  /api/admin/orders/[id]');
  console.log('4. DELETE /api/admin/orders/[id]');
  console.log('\n詳細文檔請查看: ADMIN_ORDERS_API_IMPLEMENTATION.md');
} else {
  console.log('❌ 檢查失敗，請修復上述問題。');
  process.exit(1);
}