import fetch from 'node-fetch'

// 測試登入功能
async function testLogin(taxId: string, password: string, description: string) {
  console.log(`\n🔍 測試 ${description} 登入...`)
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taxId,
        password,
        rememberMe: false
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ ${description} 登入成功!`)
      console.log(`   用戶資訊: ${data.user?.name || 'N/A'} (${data.user?.role})`)
      console.log(`   會話令牌: ${data.session?.token?.substring(0, 20)}...`)
      return true
    } else {
      console.log(`❌ ${description} 登入失敗: ${data.error || '未知錯誤'}`)
      console.log(`   狀態碼: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ ${description} 登入測試錯誤: ${error.message}`)
    console.log(`   💡 請確保開發伺服器正在運行: npm run dev`)
    return false
  }
}

// 測試 API 健康狀態
async function testApiHealth() {
  console.log('🔍 測試 API 健康狀態...')
  
  try {
    const response = await fetch('http://localhost:3000/api/health')
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ API 健康檢查通過')
      console.log(`   狀態: ${data.status}`)
      console.log(`   時間: ${data.timestamp}`)
      return true
    } else {
      console.log('❌ API 健康檢查失敗')
      return false
    }
  } catch (error) {
    console.log(`❌ API 健康檢查錯誤: ${error.message}`)
    return false
  }
}

// 主函數
async function main() {
  console.log('🚀 CEO 平台登入功能測試')
  console.log('==============================')
  
  // 測試 API 健康狀態
  const apiHealthy = await testApiHealth()
  if (!apiHealthy) {
    console.log('\n⚠️  API 不可用，請先啟動開發伺服器:')
    console.log('   cd /home/hsu/Desktop/CEO/ceo-monorepo/apps/web')
    console.log('   npm run dev')
    return
  }
  
  console.log('\n📋 測試帳號列表:')
  console.log('1. 管理員帳號: 12345678 / Admin1234!')
  console.log('2. 測試用戶帳號: 87654321 / User1234!')
  
  // 測試管理員登入
  const adminSuccess = await testLogin('12345678', 'Admin1234!', '管理員帳號')
  
  // 測試用戶登入
  const userSuccess = await testLogin('87654321', 'User1234!', '測試用戶帳號')
  
  // 測試錯誤密碼
  const wrongPassword = await testLogin('12345678', 'WrongPassword!', '錯誤密碼')
  
  // 測試不存在的帳號
  const notExist = await testLogin('99999999', 'Test1234!', '不存在的帳號')
  
  // 總結
  console.log('\n📊 測試結果總結:')
  console.log(`   ✅ 成功: ${[adminSuccess, userSuccess].filter(Boolean).length}/2`)
  console.log(`   ❌ 失敗: ${[wrongPassword, notExist].filter(Boolean).length}/2 (預期失敗)`)
  
  if (adminSuccess && userSuccess) {
    console.log('\n🎉 所有預期登入測試通過!')
    console.log('\n💡 下一步:')
    console.log('   1. 訪問 http://localhost:3000/login 進行網頁登入')
    console.log('   2. 管理員可訪問 http://localhost:3000/admin')
    console.log('   3. 用戶可訪問 http://localhost:3000/ 首頁')
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查:')
    console.log('   1. 資料庫連接是否正常')
    console.log('   2. 測試帳號是否已創建')
    console.log('   3. 開發伺服器是否正常運行')
  }
}

// 執行測試
main().catch(console.error)