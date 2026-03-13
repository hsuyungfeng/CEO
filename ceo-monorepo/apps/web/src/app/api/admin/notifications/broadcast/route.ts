// POST /api/admin/notifications/broadcast - 發送系統廣播通知
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { NotificationService } from '@/lib/notification-service'
import { NotificationType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin()
    if ('error' in adminCheck) {
      return adminCheck.error
    }

    const body = await request.json()
    
    // 驗證輸入
    const { title, content, type = NotificationType.SYSTEM_ANNOUNCEMENT, data } = body
    
    if (!title || !content) {
      return NextResponse.json(
        { error: '標題和內容為必填項' },
        { status: 400 }
      )
    }

    // 驗證通知類型
    if (!Object.values(NotificationType).includes(type)) {
      return NextResponse.json(
        { error: '無效的通知類型' },
        { status: 400 }
      )
    }

    // 發送廣播通知
    const notifications = await NotificationService.sendBroadcastNotification(
      title,
      content,
      type,
      data
    )

    return NextResponse.json({
      success: true,
      data: {
        sentCount: notifications?.length || 0,
        message: '廣播通知已發送',
      },
    })
  } catch (error) {
    console.error('發送廣播通知失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '發送廣播通知失敗' 
      },
      { status: 500 }
    )
  }
}