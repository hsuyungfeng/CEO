import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { NotificationService } from '@/lib/push-notifications/notification-service';
import { ApiResponse } from '@/types/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const sendSchema = z.object({
  userId: z.string().cuid('用戶ID格式不正確').optional(),
  title: z.string().min(1, '標題不能為空').max(100, '標題不能超過100字'),
  body: z.string().min(1, '內容不能為空').max(500, '內容不能超過500字'),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }
    const user = adminCheck.user;

    const body = await request.json();
    const validated = sendSchema.safeParse(body);
    if (!validated.success) {
      const errors = validated.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json({
        success: false,
        error: '請求參數驗證失敗',
        errors,
      } as ApiResponse, { status: 400 });
    }

    const notificationService = new NotificationService();
    let results;

    if (validated.data.userId) {
      logger.info({ adminUserId: user.id, targetUserId: validated.data.userId }, 'Admin sending notification to specific user');
      results = await notificationService.sendToUser(
        validated.data.userId,
        validated.data.title,
        validated.data.body,
        validated.data.data
      );
    } else {
      logger.info({ adminUserId: user.id }, 'Admin broadcasting notification to all users');
      results = await notificationService.sendToAllUsers(
        validated.data.title,
        validated.data.body,
        validated.data.data
      );
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info({ adminUserId: user.id, total: results.length, success: successCount, failure: failureCount }, 'Notification sending completed');

    return NextResponse.json({
      success: true,
      message: `通知發送完成`,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount,
      },
      results,
    } as ApiResponse);
  } catch (error) {
    logger.error({ err: error }, 'Notification send error');
    return NextResponse.json({ 
      success: false,
      error: '發送失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    } as ApiResponse, { status: 500 });
  }
}