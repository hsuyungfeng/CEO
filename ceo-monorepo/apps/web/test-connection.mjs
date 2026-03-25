import prisma from './src/lib/prisma.js';

async function test() {
  try {
    console.log('嘗試連接資料庫...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ 連接成功!', result);
  } catch (error) {
    console.error('❌ 連接失敗:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
