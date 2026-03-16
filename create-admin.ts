import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const adminPassword = 'Admin@12345';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: { 
        password: hashedPassword,
        role: 'ADMIN'
      },
      create: {
        email: 'admin@test.com',
        name: '管理員',
        phone: '0912345678',
        taxId: '87654321',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      }
    });
    
    console.log('✅ 管理員帳號已建立/更新');
    console.log('📝 管理員登入資訊:');
    console.log('  統一編號: 87654321');
    console.log('  密碼: Admin@12345');
    console.log('  電子郵件: admin@test.com');
    console.log('  角色: ADMIN');
    
  } catch (error) {
    console.error('❌ 錯誤:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

main();
