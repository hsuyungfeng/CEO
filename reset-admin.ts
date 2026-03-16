import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const p = new PrismaClient();
const pwd = await bcrypt.hash('Admin123456', 10);
const u = await p.user.upsert({
  where: { email: 'admin@ceo.test' },
  update: { password: pwd },
  create: { email: 'admin@ceo.test', name: 'Admin', taxId: '88888888', phone: '0988888888', password: pwd, role: 'ADMIN', status: 'ACTIVE' }
});
console.log('✅ 新管理員帳號: 88888888 / Admin123456');
await p.$disconnect();
