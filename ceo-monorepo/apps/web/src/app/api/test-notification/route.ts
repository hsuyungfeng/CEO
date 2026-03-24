import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { NotificationIntegration } from '@/lib/notification-integration'
import { getWebSocketServer } from '@/lib/notification-service'

/**
 * 測試端點 - 發送測試通知以驗證 WebSocket 整合
 * POST /api/test-notification
 *
 * 開發模式：跳過認證，直接發送測試通知
 */
export async function POST(request: Request) {
  try {
    console.log('[test-notification] 收到測試通知請求')

    const body = await request.json()
    const { orderNo = 'TEST-001', status = 'CONFIRMED', userId = 'test-admin-id' } = body
    console.log('[test-notification] 準備發送通知:', { orderNo, status, userId })

    // 開發模式：使用測試 userId（測試用 credentials login 回傳的 ID）
    const testUserId = userId || 'test-admin-id'

    // 直接推送通知給 WebSocket 客戶端
    const notification = {
      id: 'test-' + Date.now(),
      title: '訂單已確認',
      message: `您的訂單 #${orderNo} 已確認，準備發貨。`,
      type: status,
      createdAt: new Date(),
      read: false
    }

    // 調用內部端點直接推送到 WebSocket 伺服器
    const internalResponse = await fetch('http://localhost:3000/api/_internal/push-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        notification
      })
    })

    const internalResult = await internalResponse.json()
    console.log('[test-notification] 內部推送結果:', internalResult)

    return NextResponse.json({
      success: true,
      message: '測試通知已發送',
      userId: testUserId,
      orderNo,
      status,
      sentCount: internalResult.sentCount || 0
    })
  } catch (error) {
    console.error('[test-notification] 發送錯誤:', error)
    return NextResponse.json(
      { error: '發送通知失敗', details: String(error) },
      { status: 500 }
    )
  }
}
