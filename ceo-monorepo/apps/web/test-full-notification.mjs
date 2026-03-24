import WebSocket from 'ws';
import http from 'http';

const userId = 'test-admin-id'; // 與 test-notification API 對應
let receivedNotification = false;

const ws = new WebSocket('ws://localhost:3000/ws/notifications');

console.log('\n' + '═'.repeat(70));
console.log('🧪 WebSocket 實時通知完整驗證流程');
console.log('═'.repeat(70) + '\n');

ws.addEventListener('open', () => {
  console.log('✅ 第 1/4 步 - WebSocket 連接成功');
  console.log(`   路徑: ws://localhost:3000/ws/notifications\n`);
  
  const authMessage = {
    type: 'auth',
    token: userId
  };

  console.log('✅ 第 2/4 步 - 發送認證訊息');
  console.log(`   用戶 ID: ${userId}\n`);
  
  ws.send(JSON.stringify(authMessage));
});

ws.addEventListener('message', (e) => {
  try {
    const message = JSON.parse(e.data);
    
    if (message.type === 'auth_success') {
      console.log('✅ 第 3/4 步 - 認證成功');
      console.log(`   客戶端已準備接收通知\n`);
      
      console.log('⏳ 第 4/4 步 - 觸發訂單狀態變更...\n');
      triggerNotification();
      
    } else if (message.type === 'notification') {
      console.log('✅ 第 4/4 步 - 實時通知接收成功！');
      console.log('─'.repeat(70));
      console.log('📨 通知內容:');
      console.log(`   標題: ${message.data.title}`);
      console.log(`   訊息: ${message.data.message}`);
      console.log(`   訂單狀態: ${message.data.type}`);
      console.log(`   時間: ${new Date(message.data.createdAt).toLocaleString('zh-TW')}`);
      console.log('─'.repeat(70) + '\n');
      console.log('✅ WebSocket 實時通知驗證通過！');
      
      receivedNotification = true;
      setTimeout(() => ws.close(), 1000);
    }
  } catch (e) {
    // 忽略連接訊息
  }
});

ws.addEventListener('error', (e) => {
  console.error('\n❌ WebSocket 錯誤:', e);
  process.exit(1);
});

ws.addEventListener('close', () => {
  if (receivedNotification) {
    console.log('\n🎉 測試完全成功！\n');
    process.exit(0);
  } else {
    console.log('\n❌ 未收到通知推送\n');
    process.exit(1);
  }
});

function triggerNotification() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/test-notification',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log(`   📤 API 回應: ${response.message}`);
        console.log(`   訂單號: ${response.orderNo}`);
        console.log(`   狀態: ${response.status}`);
        console.log(`   WebSocket 可用: ${response.wsAvailable ? '✅ 是' : '❌ 否'}\n`);
      } catch {
        console.log(`   📤 API 回應: ${res.statusCode}\n`);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ API 請求錯誤:', e.message);
    process.exit(1);
  });

  req.write(JSON.stringify({
    orderNo: 'TEST-ORDER-2026-001',
    status: 'CONFIRMED',
    userId: userId
  }));
  req.end();
}

// 60 秒超時
setTimeout(() => {
  console.log('\n⏱️  測試逾時（60 秒）');
  console.log('❌ 未收到推送通知\n');
  process.exit(1);
}, 60000);
