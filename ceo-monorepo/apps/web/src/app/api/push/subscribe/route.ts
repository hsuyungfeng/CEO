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
    
    const { subscription, userAgent, deviceName } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: '缺少訂閱資訊' },
        { status: 400 }
      )
    }

    // 註冊裝置訂閱
    const result = await pushNotificationService.registerDeviceSubscription(
      userId,
      subscription,
      userAgent,
      deviceName
    )

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        endpoint: result.token,
        createdAt: result.createdAt
      }
    })

  } catch (error) {
    console.error('註冊推播訂閱失敗:', error)
    return NextResponse.json(
      { success: false, error: '註冊推播訂閱失敗' },
      { status: 500 }
    )
  }
}