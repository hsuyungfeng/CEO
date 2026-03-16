import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // 使用簡單密碼
    const newPassword = 'Test@123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 先刪除舊用戶
    await prisma.user.deleteMany({
      where: { taxId: '12345678' }
    });
    
    // 建立新用戶
    const user = await prisma.user.create({
      data: {
        email: 'supplier@test.com',
        name: '測試供應商',
        phone: '0912345678',
        taxId: '12345678',
        password: hashedPassword,
        role: 'MEMBER',
        status: 'ACTIVE',
      }
    });
    
    console.log('✅ 帳號已重設');
    console.log('📝 新的登入資訊:');
    console.log('  統一編號: 12345678');
    console.log('  密碼: Test@123456');
    console.log('  電子郵件: supplier@test.com');
    
  } catch (error) {
    console.error('❌ 錯誤:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

main();
