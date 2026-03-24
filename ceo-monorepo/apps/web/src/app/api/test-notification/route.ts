import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { NotificationIntegration } from '@/lib/notification-integration'
import { getWebSocketServer } from '@/lib/notification-service'

/**
 * 測試端點 - 發送測試通知以驗證 WebSocket 整合
 * POST /api/test-notification
 */
export async function POST(request: Request) {
  try {
    console.log('[test-notification] 收到測試通知請求')

    // Debug: Check WebSocket server availability
    const wsServer = getWebSocketServer()
    console.log('[test-notification] WebSocket 伺服器可用?:', !!wsServer)

    const session = await auth()
    console.log('[test-notification] Session:', session?.user?.id)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未經授權' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderNo = 'TEST-001', status = 'CONFIRMED' } = body
    console.log('[test-notification] 準備發送通知:', { orderNo, status, userId: session.user.id })

    // 發送測試訂單通知
    const result = await NotificationIntegration.sendOrderStatusNotification(
      session.user.id,
      'test-order-id',
      orderNo,
      status
    )
    console.log('[test-notification] 通知發送結果:', result)

    return NextResponse.json({
      success: true,
      message: '測試通知已發送',
      userId: session.user.id,
      orderNo,
      status,
      result: result ? '已創建' : '跳過',
      wsAvailable: !!wsServer
    })
  } catch (error) {
    console.error('[test-notification] 發送錯誤:', error)
    return NextResponse.json(
      { error: '發送通知失敗', details: String(error) },
      { status: 500 }
    )
  }
}
