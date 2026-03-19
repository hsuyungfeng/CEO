import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Twilio SMS 狀態回調端點
 * 用於接收 SMS 發送狀態更新
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // 解析 Twilio 回調參數
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    const errorCode = formData.get('ErrorCode') as string;
    const errorMessage = formData.get('ErrorMessage') as string;

    console.log(`SMS 回調收到: ${messageSid} - ${messageStatus}`);

    if (!messageSid) {
      return NextResponse.json(
        { error: '缺少 MessageSid 參數' },
        { status: 400 }
      );
    }

    // 查找對應的通知發送記錄
    const delivery = await prisma.notificationDelivery.findFirst({
      where: {
        externalId: messageSid,
        channel: 'SMS'
      }
    });

    if (delivery) {
      // 更新發送記錄狀態
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: mapTwilioStatus(messageStatus),
          deliveredAt: messageStatus === 'delivered' ? new Date() : undefined,
          error: errorMessage || undefined,
          metadata: {
            ...(delivery.metadata as any),
            twilioStatus: messageStatus,
            errorCode,
            updatedAt: new Date().toISOString()
          }
        }
      });

      console.log(`SMS 發送記錄已更新: ${messageSid} -> ${messageStatus}`);
    } else {
      console.warn(`找不到對應的 SMS 發送記錄: ${messageSid}`);
      
      // 記錄未匹配的回調
      await prisma.smsCallbackLog.create({
        data: {
          messageSid,
          status: messageStatus,
          toNumber: to,
          fromNumber: from,
          errorCode,
          errorMessage,
          rawData: JSON.stringify(Object.fromEntries(formData.entries()))
        }
      });
    }

    // 返回 Twilio 期望的響應
    return new NextResponse('<Response></Response>', {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error('SMS 回調處理錯誤:', error);
    
    // 仍然返回成功響應給 Twilio，避免重試
    return new NextResponse('<Response></Response>', {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
}

/**
 * 將 Twilio 狀態映射到內部狀態
 */
function mapTwilioStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    'queued': 'PENDING',
    'sending': 'SENDING',
    'sent': 'SENT',
    'delivered': 'DELIVERED',
    'undelivered': 'FAILED',
    'failed': 'FAILED',
    'accepted': 'SENT',
    'scheduled': 'PENDING',
    'canceled': 'CANCELLED'
  };

  return statusMap[twilioStatus] || 'UNKNOWN';
}

/**
 * 獲取 SMS 發送統計
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Prisma.NotificationDeliveryWhereInput = {
      channel: 'SMS'
    };

    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) where.sentAt.gte = new Date(startDate);
      if (endDate) where.sentAt.lte = new Date(endDate);
    }

    const [total, byStatus, recentDeliveries] = await Promise.all([
      prisma.notificationDelivery.count({ where }),
      prisma.notificationDelivery.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.notificationDelivery.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: 10,
        include: {
          notification: {
            select: {
              title: true,
              type: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      })
    ]);

    const statusStats: Record<string, number> = {};
    byStatus.forEach(item => {
      statusStats[item.status] = item._count;
    });

    return NextResponse.json({
      total,
      statusStats,
      recentDeliveries: recentDeliveries.map(delivery => ({
        id: delivery.id,
        status: delivery.status,
        sentAt: delivery.sentAt,
        deliveredAt: delivery.deliveredAt,
        recipient: delivery.recipient,
        notification: delivery.notification ? {
          title: delivery.notification.title,
          type: delivery.notification.type,
          userName: delivery.notification.user?.name,
          userEmail: delivery.notification.user?.email
        } : null
      }))
    });
  } catch (error) {
    console.error('獲取 SMS 統計錯誤:', error);
    return NextResponse.json(
      { error: '獲取統計數據時發生錯誤' },
      { status: 500 }
    );
  }
}