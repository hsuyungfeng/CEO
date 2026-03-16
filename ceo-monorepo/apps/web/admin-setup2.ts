import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = 'Admin@12345';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { password: hashedPassword, role: 'ADMIN' },
    create: {
      email: 'admin@test.com',
      name: '管理員',
      phone: '0912345678',
      taxId: '11111111',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    }
  });
  
  console.log('✅ 管理員帳號已建立');
  console.log('📝 登入資訊:');
  console.log('  統一編號: 11111111');
  console.log('  密碼: Admin@12345');
  await prisma.$disconnect();
}

main().catch(console.error);
