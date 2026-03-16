import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加載環境變數
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function seedCategories() {
  try {
    // 清除現有分類（可選）
    // await prisma.category.deleteMany();

    // 檢查是否已有根分類
    const existingCount = await prisma.category.count();
    if (existingCount > 0) {
      console.log(`已存在 ${existingCount} 個分類，跳過初始化`);
      return;
    }

    // 建立一級分類
    const pharma = await prisma.category.create({
      data: {
        name: '藥品',
        level: 1,
        sortOrder: 1,
        isActive: true,
      },
    });

    const food = await prisma.category.create({
      data: {
        name: '食品',
        level: 1,
        sortOrder: 2,
        isActive: true,
      },
    });

    const supplies = await prisma.category.create({
      data: {
        name: '物資',
        level: 1,
        sortOrder: 3,
        isActive: true,
      },
    });

    // 建立二級分類（藥品下）
    await prisma.category.create({
      data: {
        name: '感冒藥',
        parentId: pharma.id,
        level: 2,
        sortOrder: 1,
        isActive: true,
      },
    });

    await prisma.category.create({
      data: {
        name: '消炎藥',
        parentId: pharma.id,
        level: 2,
        sortOrder: 2,
        isActive: true,
      },
    });

    await prisma.category.create({
      data: {
        name: '維生素',
        parentId: pharma.id,
        level: 2,
        sortOrder: 3,
        isActive: true,
      },
    });

    // 建立二級分類（食品下）
    await prisma.category.create({
      data: {
        name: '飲料',
        parentId: food.id,
        level: 2,
        sortOrder: 1,
        isActive: true,
      },
    });

    await prisma.category.create({
      data: {
        name: '零食',
        parentId: food.id,
        level: 2,
        sortOrder: 2,
        isActive: true,
      },
    });

    // 建立三級分類（感冒藥下）
    const coldDrug = await prisma.category.findFirst({
      where: { name: '感冒藥', parentId: pharma.id },
    });

    if (coldDrug) {
      await prisma.category.create({
        data: {
          name: '綜合感冒藥',
          parentId: coldDrug.id,
          level: 3,
          sortOrder: 1,
          isActive: true,
        },
      });

      await prisma.category.create({
        data: {
          name: '止咳藥',
          parentId: coldDrug.id,
          level: 3,
          sortOrder: 2,
          isActive: true,
        },
      });
    }

    console.log('✅ 分類初始化完成');
  } catch (error) {
    console.error('❌ 分類初始化失敗:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
