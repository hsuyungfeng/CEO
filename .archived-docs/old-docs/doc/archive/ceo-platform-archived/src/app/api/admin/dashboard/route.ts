import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger'

// GET: 獲取儀表板統計數據
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 獲取查詢參數（時間範圍）
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, year

    // 計算時間範圍
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'today':
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // 並行獲取所有統計數據
    const [
      totalOrders,
      totalRevenue,
      totalUsers,
      totalProducts,
      recentOrders,
      orderStats,
      revenueStats,
      topProducts,
      recentMessages,
    ] = await Promise.all([
      // 1. 總訂單數
      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // 2. 總營業額
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: { not: 'CANCELLED' },
        },
        _sum: {
          totalAmount: true,
        },
      }),

      // 3. 總會員數
      prisma.user.count({
        where: {
          role: 'MEMBER',
          createdAt: { gte: startDate },
        },
      }),

      // 4. 總商品數
      prisma.product.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // 5. 最近訂單（最近10筆）
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNo: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              taxId: true,
            },
          },
        },
      }),

      // 6. 訂單狀態統計
      prisma.order.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: {
          _all: true,
        },
      }),

      // 7. 每日營業額統計（最近7天）
      (async () => {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const revenueByDay = await prisma.order.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: { gte: sevenDaysAgo },
            status: { not: 'CANCELLED' },
          },
          _sum: {
            totalAmount: true,
          },
        });

        // 格式化為每日數據
        const dailyRevenue: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          dailyRevenue[dateKey] = 0;
        }

        revenueByDay.forEach(item => {
          const dateKey = item.createdAt.toISOString().split('T')[0];
          if (dailyRevenue[dateKey] !== undefined) {
            dailyRevenue[dateKey] += Number(item._sum.totalAmount || 0);
          }
        });

        return Object.entries(dailyRevenue)
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .map(([date, amount]) => ({ date, amount }));
      })(),

      // 8. 熱門商品（銷售量前5）
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: { gte: startDate },
            status: { not: 'CANCELLED' },
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 5,
      }).then(async items => {
        const productIds = items.map(item => item.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, image: true },
        });

        return items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            productName: product?.name || '未知商品',
            productImage: product?.image,
            totalSold: item._sum.quantity || 0,
          };
        });
      }),

      // 9. 最近聯絡訊息（最近5筆未讀）
      prisma.contactMessage.findMany({
        where: {
          createdAt: { gte: startDate },
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          subject: true,
          createdAt: true,
        },
      }),
    ]);

    // 計算訂單狀態百分比
    const totalOrderCount = orderStats.reduce((sum, stat) => sum + stat._count._all, 0);
    const orderStatusStats = orderStats.map(stat => ({
      status: stat.status,
      count: stat._count._all,
      percentage: totalOrderCount > 0 ? (stat._count._all / totalOrderCount) * 100 : 0,
    }));

    // 格式化最近訂單數據
    const formattedRecentOrders = recentOrders.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      customerName: order.user?.name || '未知客戶',
      customerTaxId: order.user?.taxId || '未知統編',
    }));

    // 格式化最近聯絡訊息
    const formattedRecentMessages = recentMessages.map(message => ({
      id: message.id,
      name: message.name,
      email: message.email,
      subject: message.subject || '無主題',
      createdAt: message.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        // 主要統計卡片
        summary: {
          totalOrders,
          totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
          totalUsers,
          totalProducts,
        },
        // 訂單狀態統計
        orderStats: orderStatusStats,
        // 營業額趨勢
        revenueTrend: revenueStats,
        // 熱門商品
        topProducts,
        // 最近訂單
        recentOrders: formattedRecentOrders,
        // 最近聯絡訊息
        recentMessages: formattedRecentMessages,
        // 時間範圍
        period,
        startDate,
        endDate: now,
      },
    } as ApiResponse);

  } catch (error) {
    logger.error({ err: error }, '獲取儀表板統計數據錯誤');
    return NextResponse.json(
      {
        success: false,
        error: '伺服器錯誤，請稍後再試',
      } as ApiResponse,
      { status: 500 }
    );
  }
}