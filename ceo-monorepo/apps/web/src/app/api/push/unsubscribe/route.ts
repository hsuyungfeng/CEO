import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { pushNotificationService } from '@/lib/push-notification-service'

export async function POST(request: NextRequest) {
  try {
    // 驗證用戶（NextAuth v5 直接使用 auth()）
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未授權' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: '缺少端點資訊' },
        { status: 400 }
      )
    }

    // 取消註冊裝置訂閱
    await pushNotificationService.unregisterDeviceSubscription(userId, endpoint)

    return NextResponse.json({
      success: true,
      message: '推播訂閱已取消'
    })

  } catch (error) {
    console.error('取消推播訂閱失敗:', error)
    return NextResponse.json(
      { success: false, error: '取消推播訂閱失敗' },
      { status: 500 }
    )
  }
}