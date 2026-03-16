import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const testPassword = '123456';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'supplier@test.com' },
      update: { password: hashedPassword },
      create: {
        email: 'supplier@test.com',
        name: '王小明',
        phone: '0912345678',
        role: 'MEMBER',
        password: hashedPassword,
        taxId: '12345678',
      },
    });
    
    console.log('✅ 測試帳號設置完成');
    console.log('📝 登入資訊：');
    console.log('  統一編號: 12345678');
    console.log('  密碼: 123456');
    console.log('  電子郵件: supplier@test.com');
    
  } catch (error) {
    console.error('❌ 錯誤:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

main();
