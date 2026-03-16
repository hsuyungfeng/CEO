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
      taxId: '87654321',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    }
  });
  
  console.log('✅ 管理員帳號已建立\n📝 登入資訊:\n  統一編號: 87654321\n  密碼: Admin@12345');
  await prisma.$disconnect();
}

main().catch(console.error);
