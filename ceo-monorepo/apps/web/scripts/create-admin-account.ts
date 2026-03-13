import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

// 載入環境變數
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://ceo_admin:ChangeThisPassword123!@localhost:5432/ceo_platform_production'
    }
  }
})

async function createAdminAccount() {
  console.log('🔧 創建管理員測試帳號...')
  
  try {
    // 檢查是否已有管理員帳號
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { taxId: '12345678' },
          { email: 'admin@ceo.com' }
        ]
      }
    })

    if (existingAdmin) {
      console.log('⚠️  管理員帳號已存在:')
      console.log(`   - 統一編號: ${existingAdmin.taxId}`)
      console.log(`   - 電子郵件: ${existingAdmin.email}`)
      console.log(`   - 角色: ${existingAdmin.role}`)
      console.log(`   - 狀態: ${existingAdmin.status}`)
      return
    }

    // 創建管理員帳號
    const hashedPassword = await bcrypt.hash('Admin1234!', 10)
    
    const adminUser = await prisma.user.create({
      data: {
        taxId: '12345678',
        email: 'admin@ceo.com',
        name: '系統管理員',
        phone: '0911111111', // 使用不同的電話號碼
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      }
    })

    console.log('✅ 管理員帳號創建成功:')
    console.log(`   - 統一編號: ${adminUser.taxId}`)
    console.log(`   - 密碼: Admin1234!`)
    console.log(`   - 電子郵件: ${adminUser.email}`)
    console.log(`   - 角色: ${adminUser.role}`)
    console.log(`   - 狀態: ${adminUser.status}`)
    console.log('\n📝 登入資訊:')
    console.log('   統一編號: 12345678')
    console.log('   密碼: Admin1234!')
    console.log('   角色: SUPER_ADMIN')

  } catch (error) {
    console.error('❌ 創建管理員帳號失敗:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 創建簡單測試用戶帳號
async function createTestUserAccount() {
  console.log('\n🔧 創建測試用戶帳號...')
  
  try {
    // 檢查是否已有測試用戶
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { taxId: '87654321' },
          { email: 'user@test.com' }
        ]
      }
    })

    if (existingUser) {
      console.log('⚠️  測試用戶帳號已存在:')
      console.log(`   - 統一編號: ${existingUser.taxId}`)
      console.log(`   - 電子郵件: ${existingUser.email}`)
      console.log(`   - 角色: ${existingUser.role}`)
      return
    }

    // 創建測試用戶帳號
    const hashedPassword = await bcrypt.hash('User1234!', 10)
    
    const testUser = await prisma.user.create({
      data: {
        taxId: '87654321',
        email: 'user@test.com',
        name: '測試用戶',
        phone: '0987654321',
        password: hashedPassword,
        role: 'MEMBER',
        status: 'ACTIVE',
        emailVerified: true,
      }
    })

    console.log('✅ 測試用戶帳號創建成功:')
    console.log(`   - 統一編號: ${testUser.taxId}`)
    console.log(`   - 密碼: User1234!`)
    console.log(`   - 電子郵件: ${testUser.email}`)
    console.log(`   - 角色: ${testUser.role}`)
    console.log('\n📝 登入資訊:')
    console.log('   統一編號: 87654321')
    console.log('   密碼: User1234!')
    console.log('   角色: MEMBER')

  } catch (error) {
    console.error('❌ 創建測試用戶帳號失敗:', error)
  }
}

// 主函數
async function main() {
  console.log('🚀 CEO 平台測試帳號創建工具')
  console.log('==============================')
  
  await createAdminAccount()
  await createTestUserAccount()
  
  console.log('\n🎉 所有測試帳號創建完成！')
  console.log('\n📋 測試帳號總覽:')
  console.log('1. 管理員帳號:')
  console.log('   - 統一編號: 12345678')
  console.log('   - 密碼: Admin1234!')
  console.log('   - 角色: SUPER_ADMIN')
  console.log('\n2. 測試用戶帳號:')
  console.log('   - 統一編號: 87654321')
  console.log('   - 密碼: User1234!')
  console.log('   - 角色: MEMBER')
  console.log('\n💡 使用說明:')
  console.log('   - 前往登入頁面: http://localhost:3000/login')
  console.log('   - 使用統一編號和密碼登入')
  console.log('   - 管理員可訪問 /admin 後台')
}

main()
  .catch((e) => {
    console.error('執行錯誤:', e)
    process.exit(1)
  })