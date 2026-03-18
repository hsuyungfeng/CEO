import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // 查詢所有啟用的分類
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    // 建立三級分類樹
    const categoryTree = categories
      .filter(category => category.level === 1) // 第一級分類
      .map(level1Category => ({
        id: level1Category.id,
        name: level1Category.name,
        level: level1Category.level,
        sortOrder: level1Category.sortOrder,
        children: level1Category.children
          .filter(child => child.level === 2) // 第二級分類
          .map(level2Category => ({
            id: level2Category.id,
            name: level2Category.name,
            level: level2Category.level,
            sortOrder: level2Category.sortOrder,
            children: level2Category.children
              .filter(child => child.level === 3) // 第三級分類
              .map(level3Category => ({
                id: level3Category.id,
                name: level3Category.name,
                level: level3Category.level,
                sortOrder: level3Category.sortOrder,
              })),
          })),
      }));

    return NextResponse.json(categoryTree);

  } catch (error) {
    logger.error({ err: error }, '取得分類列表錯誤');
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}