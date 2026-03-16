import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const newPassword = 'Test@123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'supplier@test.com' },
      update: { 
        password: hashedPassword,
        taxId: '12345678'
      },
      create: {
        email: 'supplier@test.com',
        name: '測試供應商',
        phone: '0912345678',
        taxId: '12345678',
        password: hashedPassword,
        role: 'MEMBER',
        status: 'ACTIVE',
      }
    });
    
    console.log('✅ 帳號已更新');
    console.log('📝 登入資訊:');
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
