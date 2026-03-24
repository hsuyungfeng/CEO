// 通知服務 - Phase 9 通知系統核心服務
import { prisma } from '@/lib/prisma'
import { NotificationType, NotificationStatus, NotificationChannel, NotificationPreference, Notification } from '@prisma/client'
import { EmailService } from '@/lib/email/service'
import { createNotificationEmailTemplate } from '@/lib/email/templates'
import { pushNotificationService } from './push-notification-service'
import { getTwilioSmsService } from './sms/twilio-service'

// WebSocket 伺服器實例（由主應用程式設置）
import { NotificationWebSocketServer } from './websocket-server'

let websocketServer: NotificationWebSocketServer | null = null

export function setWebSocketServer(server: NotificationWebSocketServer) {
  console.log('[notification-service] 接收到 WebSocket 伺服器實例:', !!server)
  websocketServer = server
  console.log('[notification-service] WebSocket 伺服器已設置，websocketServer:', !!websocketServer)
}

/**
 * 取得 WebSocket 伺服器實例 (支援動態初始化)
 * 使用 getter 而非直接參考，確保在 Route Handler 中能取得最新的實例
 */
export function getWebSocketServer(): NotificationWebSocketServer | null {
  return websocketServer
}

// 電子郵件服務實例
const emailService = new EmailService()

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  content: string
  data?: Record<string, unknown>
  relatedId?: string
  relatedType?: string
  channels?: NotificationChannel[]
}

export interface NotificationFilter {
  userId: string
  type?: NotificationType
  status?: NotificationStatus
  isRead?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Partial<Record<NotificationType, number>>
  byStatus: Partial<Record<NotificationStatus, number>>
}

export class NotificationService {
  /**
   * 創建通知
   */
  static async createNotification(input: CreateNotificationInput) {
    const { userId, type, title, content, data, relatedId, relatedType, channels = [NotificationChannel.IN_APP] } = input

    // 開發模式：跳過資料庫，直接發送 WebSocket 通知用於測試
    if (process.env.WEBSOCKET_DEV_MODE === 'true') {
      console.log('[WebSocket Dev Mode] 跳過資料庫，直接發送通知')
      const ws = getWebSocketServer()
      if (ws && channels.includes(NotificationChannel.IN_APP)) {
        try {
          const sentCount = await ws.sendNotificationToUser(userId, {
            id: 'test-' + Date.now(),
            type: type,
            title,
            message: content,
            createdAt: new Date(),
            read: false
          })
          console.log(`WebSocket 測試通知已發送給用戶 ${userId}，${sentCount} 個客戶端`)
          return {
            id: 'test-' + Date.now(),
            type,
            title,
            content,
            userId,
            read: false,
            isRead: false
          } as any
        } catch (error) {
          console.error('通過 WebSocket 發送測試通知時發生錯誤:', error)
          throw error
        }
      } else {
        console.warn('[WebSocket Dev Mode] WebSocket 伺服器尚未初始化或管道不包含 IN_APP')
      }
      return null
    }

    // 檢查用戶通知偏好
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId },
    })

    // 如果用戶禁用此類型通知，則不創建
    if (preference) {
      const typeEnabled = this.isNotificationTypeEnabled(type, preference)
      if (!typeEnabled) {
        return null
      }

      // 檢查靜默時段
      if (preference.quietEnabled && this.isQuietTime(preference)) {
        // 靜默時段，只記錄但不立即發送
        channels.length = 0
        channels.push(NotificationChannel.IN_APP) // 只保留站內通知
      }
    }

    // 創建通知
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        data: data ? JSON.stringify(data) : null,
        relatedId,
        relatedType,
        channels,
        status: NotificationStatus.UNREAD,
        isRead: false,
        isSent: channels.length === 0, // 如果沒有發送渠道，標記為已發送
        sentAt: channels.length === 0 ? new Date() : null,
      },
    })

    // 非同步發送通知到各渠道
    if (channels.length > 0) {
      this.sendNotificationToChannels(notification, channels).catch(console.error)
    }

    // 通過 WebSocket 發送即時通知
    const ws = getWebSocketServer()
    if (ws && channels.includes(NotificationChannel.IN_APP)) {
      try {
        const sentCount = await ws.sendNotificationToUser(userId, {
          ...notification,
          message: content,
          createdAt: notification.createdAt
        })
        console.log(`WebSocket 通知已發送給用戶 ${userId}，${sentCount} 個客戶端`)
      } catch (error) {
        console.error('通過 WebSocket 發送通知時發生錯誤:', error)
      }
    }

    return notification
  }

  /**
   * 批量創建通知
   */
  static async createNotifications(inputs: CreateNotificationInput[]) {
    const notifications = []
    
    for (const input of inputs) {
      const notification = await this.createNotification(input)
      if (notification) {
        notifications.push(notification)
      }
    }
    
    return notifications
  }

  /**
   * 獲取用戶通知列表
   */
  static async getUserNotifications(filter: NotificationFilter) {
    const {
      userId,
      type,
      status,
      isRead,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
    } = filter

    const where: {
      userId: string
      type?: NotificationType
      status?: NotificationStatus
      isRead?: boolean
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = { userId }

    if (type) where.type = type
    if (status) where.status = status
    if (isRead !== undefined) where.isRead = isRead
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          deliveries: {
            select: {
              channel: true,
              status: true,
              sentAt: true,
              deliveredAt: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ])

    return {
      notifications,
      total,
      hasMore: offset + notifications.length < total,
    }
  }

  /**
   * 獲取未讀通知數量
   */
  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
        status: {
          not: NotificationStatus.DELETED,
        },
      },
    })
  }

  /**
   * 標記通知為已讀
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        status: {
          not: NotificationStatus.DELETED,
        },
      },
    })

    if (!notification) {
      throw new Error('通知不存在或無權限訪問')
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
        status: notification.status === NotificationStatus.UNREAD ? NotificationStatus.READ : notification.status,
      },
    })
  }

  /**
   * 標記所有通知為已讀
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        status: {
          not: NotificationStatus.DELETED,
        },
      },
      data: {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    })
  }

  /**
   * 歸檔通知
   */
  static async archiveNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        status: {
          not: NotificationStatus.DELETED,
        },
      },
    })

    if (!notification) {
      throw new Error('通知不存在或無權限訪問')
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.ARCHIVED,
      },
    })
  }

  /**
   * 刪除通知（軟刪除）
   */
  static async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    })

    if (!notification) {
      throw new Error('通知不存在或無權限訪問')
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.DELETED,
      },
    })
  }

  /**
   * 獲取通知統計
   */
  static async getNotificationStats(userId: string): Promise<NotificationStats> {
    const [total, unread, byType, byStatus] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          status: {
            not: NotificationStatus.DELETED,
          },
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
          status: {
            not: NotificationStatus.DELETED,
          },
        },
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: {
          userId,
          status: {
            not: NotificationStatus.DELETED,
          },
        },
        _count: true,
      }),
      prisma.notification.groupBy({
        by: ['status'],
        where: {
          userId,
        },
        _count: true,
      }),
    ])

    const byTypeMap: Partial<Record<NotificationType, number>> = {}
    const byStatusMap: Partial<Record<NotificationStatus, number>> = {}

    // 初始化所有類型為0
    Object.values(NotificationType).forEach(type => {
      byTypeMap[type] = 0
    })

    // 初始化所有狀態為0
    Object.values(NotificationStatus).forEach(status => {
      byStatusMap[status] = 0
    })

    // 填充實際數據
    byType.forEach(item => {
      byTypeMap[item.type] = item._count
    })

    byStatus.forEach(item => {
      byStatusMap[item.status] = item._count
    })

    return {
      total,
      unread,
      byType: byTypeMap,
      byStatus: byStatusMap,
    }
  }

  /**
   * 發送系統廣播通知
   */
  static async sendBroadcastNotification(
    title: string,
    content: string,
    type: NotificationType = NotificationType.SYSTEM_ANNOUNCEMENT,
  data?: Record<string, unknown>
  ) {
    // 獲取所有活躍用戶
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    })

    const notifications = users.map(user => ({
      userId: user.id,
      type,
      title,
      content,
      data,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    }))

    return this.createNotifications(notifications)
  }

  /**
   * 檢查通知類型是否啟用
   */
  private static isNotificationTypeEnabled(type: NotificationType, preference: NotificationPreference): boolean {
    switch (type) {
      case NotificationType.SUPPLIER_APPLICATION:
        return preference.supplierApplicationEnabled
      case NotificationType.ORDER_STATUS:
        return preference.orderStatusEnabled
      case NotificationType.PAYMENT_REMINDER:
        return preference.paymentReminderEnabled
      case NotificationType.PURCHASE_RECOMMENDATION:
        return preference.purchaseRecommendationEnabled
      case NotificationType.SUPPLIER_RATING:
        return preference.supplierRatingEnabled
      case NotificationType.DELIVERY_PREDICTION:
        return preference.deliveryPredictionEnabled
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return preference.systemAnnouncementEnabled
      case NotificationType.SECURITY_ALERT:
        return preference.securityAlertEnabled
      default:
        return true
    }
  }

  /**
   * 檢查是否在靜默時段
   */
  private static isQuietTime(preference: NotificationPreference): boolean {
    if (!preference.quietEnabled || preference.quietStartHour === null || preference.quietEndHour === null) {
      return false
    }

    const now = new Date()
    const currentHour = now.getHours()

    if (preference.quietStartHour <= preference.quietEndHour) {
      // 正常時段，如 22:00-08:00
      return currentHour >= preference.quietStartHour && currentHour < preference.quietEndHour
    } else {
      // 跨日時段，如 22:00-08:00（22:00到次日08:00）
      return currentHour >= preference.quietStartHour || currentHour < preference.quietEndHour
    }
  }

  /**
   * 發送通知到各渠道
   */
  private static async sendNotificationToChannels(notification: Notification, channels: NotificationChannel[]) {
    const deliveryPromises = channels.map(async channel => {
      try {
        switch (channel) {
          case NotificationChannel.EMAIL:
            await this.sendEmailNotification(notification)
            break
          case NotificationChannel.PUSH:
            await this.sendPushNotification(notification)
            break
          case NotificationChannel.SMS:
            await this.sendSmsNotification(notification)
            break
          case NotificationChannel.IN_APP:
            // 站內通知已創建，WebSocket 已在 createNotification 中處理
            // 這裡只需記錄發送記錄
            break
        }

        // 記錄發送成功
        const deliveryData: Record<string, unknown> = {
          notificationId: notification.id,
          channel,
          status: 'SENT',
          sentAt: new Date(),
          deliveredAt: new Date(),
          recipient: await this.getRecipientForChannel(notification, channel),
        };
        
        // 如果是 SMS 且有 messageId，添加 externalId
        if (channel === NotificationChannel.SMS && result?.messageId) {
          deliveryData.externalId = result.messageId;
        }
        
        await prisma.notificationDelivery.create({
          data: deliveryData,
        })

        // 更新通知發送狀態
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            isSent: true,
            sentAt: new Date(),
          },
        })
      } catch (error) {
        console.error(`發送 ${channel} 通知失敗:`, error)
        
        // 記錄發送失敗
        await prisma.notificationDelivery.create({
          data: {
            notificationId: notification.id,
            channel,
            status: 'FAILED',
            error: error instanceof Error ? error.message : '未知錯誤',
            recipient: await this.getRecipientForChannel(notification, channel),
          },
        })
      }
    })

    await Promise.all(deliveryPromises)
  }

  /**
   * 發送 Email 通知
   */
  private static async sendEmailNotification(notification: Notification) {
    try {
      // 獲取用戶資訊
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, name: true }
      })

      if (!user || !user.email) {
        console.warn(`用戶 ${notification.userId} 沒有電子郵件地址，無法發送郵件通知`)
        return
      }

      // 獲取通知類型文字
      const typeText = this.getNotificationTypeText(notification.type)
      


      // 發送電子郵件
      await emailService.sendNotificationEmail(
        user.email,
        notification.title,
        notification.content,
        typeText,
        notification.createdAt.toLocaleString('zh-TW'),
        user.name || undefined,
        notification.relatedId ? this.getActionUrl(notification) : undefined,
        this.getActionText(notification.type)
      )

      console.log(`Email 通知已發送給 ${user.email}: ${notification.title}`)
    } catch (error) {
      console.error(`發送 Email 通知失敗:`, error)
      throw error
    }
  }

  private static getNotificationTypeText(type: string): string {
    switch (type) {
      case 'SYSTEM_ANNOUNCEMENT':
        return '系統公告'
      case 'ORDER_STATUS':
        return '訂單狀態'
      case 'PAYMENT_REMINDER':
        return '付款提醒'
      case 'PURCHASE_RECOMMENDATION':
        return '採購推薦'
      case 'SUPPLIER_APPLICATION':
        return '供應商申請'
      case 'SUPPLIER_RATING':
        return '供應商評分'
      case 'DELIVERY_PREDICTION':
        return '交貨預測'
      case 'SECURITY_ALERT':
        return '安全提醒'
      default:
        return '系統通知'
    }
  }

  private static getActionUrl(notification: Notification): string | undefined {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://ceo-buy.com'
    
    switch (notification.relatedType) {
      case 'ORDER':
        return `${baseUrl}/orders/${notification.relatedId}`
      case 'SUPPLIER_APPLICATION':
        return `${baseUrl}/supplier-applications/${notification.relatedId}`
      case 'INVOICE':
        return `${baseUrl}/invoices/${notification.relatedId}`
      case 'PRODUCT':
        return `${baseUrl}/products/${notification.relatedId}`
      default:
        return `${baseUrl}/notifications`
    }
  }

  private static getActionText(type: string): string {
    switch (type) {
      case 'ORDER_STATUS':
        return '查看訂單'
      case 'PAYMENT_REMINDER':
        return '前往付款'
      case 'SUPPLIER_APPLICATION':
        return '查看申請狀態'
      case 'INVOICE':
        return '查看發票'
      default:
        return '查看詳情'
    }
  }

  /**
   * 發送推播通知
   */
  private static async sendPushNotification(notification: Notification) {
    try {
      // 創建推播通知負載
      const payload = pushNotificationService.createNotificationPayload(
        notification.title,
        notification.content,
        {
          data: {
            notificationId: notification.id,
            type: notification.type,
            relatedId: notification.relatedId,
            relatedType: notification.relatedType,
            url: this.getActionUrl(notification)
          },
          actions: [
            {
              action: 'view',
              title: '查看'
            },
            {
              action: 'mark-read',
              title: '標記已讀'
            }
          ],
          requireInteraction: notification.type === 'PAYMENT_REMINDER' || notification.type === 'SECURITY_ALERT'
        }
      )

      // 發送推播通知
      const successCount = await pushNotificationService.sendPushToUser(
        notification.userId,
        payload
      )

      console.log(`推播通知已發送給用戶 ${notification.userId}，成功: ${successCount}`)
      
      return successCount > 0
    } catch (error) {
      console.error(`發送推播通知失敗:`, error)
      throw error
    }
  }

  /**
   * 發送簡訊通知
   */
  private static async sendSmsNotification(notification: Notification) {
    try {
      // 獲取用戶手機號碼
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { phone: true, name: true }
      });

      if (!user || !user.phone) {
        console.warn(`用戶 ${notification.userId} 沒有手機號碼，無法發送簡訊通知`);
        return;
      }

      // 獲取 Twilio SMS 服務
      const smsService = getTwilioSmsService();
      const serviceStatus = smsService.getServiceStatus();

      if (!serviceStatus.enabled || !serviceStatus.clientReady) {
        console.warn('SMS 服務未啟用或配置不完整，跳過簡訊發送');
        return;
      }

      // 驗證手機號碼格式
      if (!smsService.validatePhoneNumber(user.phone)) {
        console.warn(`用戶 ${notification.userId} 的手機號碼格式無效: ${user.phone}`);
        return;
      }

      // 發送簡訊
      const result = await smsService.sendNotificationSms(
        user.phone,
        notification.type,
        notification.title,
        notification.content,
        notification.data ? JSON.parse(notification.data) : undefined
      );

      if (result.success) {
        console.log(`簡訊通知已發送給 ${user.phone}: ${notification.title} (${result.messageId})`);
      } else {
        console.error(`簡訊通知發送失敗: ${result.error}`);
        throw new Error(`簡訊發送失敗: ${result.error}`);
      }
    } catch (error) {
      console.error(`發送簡訊通知失敗:`, error);
      throw error;
    }
  }

  /**
   * 獲取渠道收件人
   */
  private static async getRecipientForChannel(notification: Notification, channel: NotificationChannel): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: {
          email: true,
          phone: true,
          name: true
        }
      });

      if (!user) {
        return `user_${notification.userId}_${channel}`;
      }

      switch (channel) {
        case NotificationChannel.EMAIL:
          return user.email || `user_${notification.userId}_email`;
        case NotificationChannel.SMS:
          return user.phone || `user_${notification.userId}_sms`;
        case NotificationChannel.PUSH:
          return `user_${notification.userId}_push`;
        case NotificationChannel.IN_APP:
          return `user_${notification.userId}_inapp`;
        default:
          return `user_${notification.userId}_${channel}`;
      }
    } catch (error) {
      console.error(`獲取渠道收件人失敗:`, error);
      return `user_${notification.userId}_${channel}`;
    }
  }
}