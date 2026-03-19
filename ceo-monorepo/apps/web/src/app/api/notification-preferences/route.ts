// GET /api/notification-preferences - 獲取通知偏好設定
// PATCH /api/notification-preferences - 更新通知偏好設定
import { NextRequest, NextResponse } from 'next/server'
import { getAuthData } from '@/lib/auth-helper'
import { prisma } from '@/lib/prisma'
import { NotificationChannel } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const authData = await getAuthData(request)
    if (!authData) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    let preference = await prisma.notificationPreference.findUnique({
      where: { userId: authData.user.id },
    })

    // 如果沒有偏好設定，創建默認設定
    if (!preference) {
      preference = await prisma.notificationPreference.create({
        data: {
          userId: authData.user.id,
          // 所有通知類型默認啟用
          supplierApplicationEnabled: true,
          orderStatusEnabled: true,
          paymentReminderEnabled: true,
          purchaseRecommendationEnabled: true,
          supplierRatingEnabled: true,
          deliveryPredictionEnabled: true,
          systemAnnouncementEnabled: true,
          securityAlertEnabled: true,
          // 默認渠道偏好
          preferredChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          // 靜默時段默認啟用：22:00-08:00
          quietStartHour: 22,
          quietEndHour: 8,
          quietEnabled: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: preference,
    })
  } catch (error) {
    console.error('獲取通知偏好設定失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '獲取通知偏好設定失敗' 
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authData = await getAuthData(request)
    if (!authData) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()

    // 驗證輸入
    const validFields = [
      'supplierApplicationEnabled',
      'orderStatusEnabled',
      'paymentReminderEnabled',
      'purchaseRecommendationEnabled',
      'supplierRatingEnabled',
      'deliveryPredictionEnabled',
      'systemAnnouncementEnabled',
      'securityAlertEnabled',
      'preferredChannels',
      'quietStartHour',
      'quietEndHour',
      'quietEnabled',
    ]

    const updateData: Record<string, unknown> = {}

    for (const field of validFields) {
      if (field in body) {
        if (field === 'preferredChannels') {
          // 驗證渠道是否有效
          const channels = body[field]
          if (Array.isArray(channels) && channels.every((c: unknown) => Object.values(NotificationChannel).includes(c as NotificationChannel))) {
            updateData[field] = channels
          }
        } else if (field === 'quietStartHour' || field === 'quietEndHour') {
          // 驗證小時是否有效 (0-23)
          const hour = body[field]
          if (hour === null || (typeof hour === 'number' && hour >= 0 && hour <= 23)) {
            updateData[field] = hour
          }
        } else if (typeof body[field] === 'boolean') {
          updateData[field] = body[field]
        }
      }
    }

    // 確保至少有一個渠道
    if (updateData.preferredChannels && (updateData.preferredChannels as unknown[]).length === 0) {
      updateData.preferredChannels = [NotificationChannel.IN_APP]
    }

    // 更新或創建偏好設定
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateDataForPrisma = updateData as any;
    const preference = await prisma.notificationPreference.upsert({
      where: { userId: authData.user.id },
      update: updateDataForPrisma,
      create: {
        userId: authData.user.id,
        supplierApplicationEnabled: true,
        orderStatusEnabled: true,
        paymentReminderEnabled: true,
        purchaseRecommendationEnabled: true,
        supplierRatingEnabled: true,
        deliveryPredictionEnabled: true,
        systemAnnouncementEnabled: true,
        securityAlertEnabled: true,
        preferredChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        quietStartHour: 22,
        quietEndHour: 8,
        quietEnabled: true,
        ...updateDataForPrisma,
      },
    })

    return NextResponse.json({
      success: true,
      data: preference,
    })
  } catch (error) {
    console.error('更新通知偏好設定失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '更新通知偏好設定失敗' 
      },
      { status: 500 }
    )
  }
}