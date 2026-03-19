// 通知整合服務 - 將通知系統與現有功能整合
import { NotificationService } from './notification-service'
import { NotificationType, NotificationChannel } from '@prisma/client'

export class NotificationIntegration {
  /**
   * 供應商申請相關通知
   */
  static async sendSupplierApplicationNotification(
    applicantId: string,
    supplierId: string,
    applicationId: string,
    action: 'submitted' | 'approved' | 'rejected'
  ) {
    let title = ''
    let content = ''
    let type = NotificationType.SUPPLIER_APPLICATION

    switch (action) {
      case 'submitted':
        title = '供應商申請已提交'
        content = '您的供應商申請已成功提交，請等待審核。'
        break
      case 'approved':
        title = '供應商申請已批准'
        content = '恭喜！您的供應商申請已獲得批准。'
        break
      case 'rejected':
        title = '供應商申請未通過'
        content = '您的供應商申請未通過審核，請查看原因並重新申請。'
        break
    }

    return NotificationService.createNotification({
      userId: applicantId,
      type,
      title,
      content,
      data: {
        supplierId,
        applicationId,
        action,
      },
      relatedId: applicationId,
      relatedType: 'SupplierApplication',
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    })
  }

  /**
   * 訂單狀態更新通知
   */
  static async sendOrderStatusNotification(
    userId: string,
    orderId: string,
    orderNo: string,
    status: string
  ) {
    const statusMap: Record<string, { title: string; content: string }> = {
      PENDING: {
        title: '訂單已創建',
        content: `您的訂單 #${orderNo} 已成功創建，正在等待處理。`,
      },
      PROCESSING: {
        title: '訂單處理中',
        content: `您的訂單 #${orderNo} 正在處理中。`,
      },
      SHIPPED: {
        title: '訂單已發貨',
        content: `您的訂單 #${orderNo} 已發貨。`,
      },
      DELIVERED: {
        title: '訂單已送達',
        content: `您的訂單 #${orderNo} 已成功送達。`,
      },
      CANCELLED: {
        title: '訂單已取消',
        content: `您的訂單 #${orderNo} 已被取消。`,
      },
    }

    const statusInfo = statusMap[status] || {
      title: '訂單狀態更新',
      content: `您的訂單 #${orderNo} 狀態已更新為 ${status}。`,
    }

    return NotificationService.createNotification({
      userId,
      type: NotificationType.ORDER_STATUS,
      title: statusInfo.title,
      content: statusInfo.content,
      data: {
        orderId,
        orderNo,
        status,
      },
      relatedId: orderId,
      relatedType: 'Order',
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    })
  }

  /**
   * 繳費提醒通知
   */
  static async sendPaymentReminderNotification(
    supplierId: string,
    reminderType: string,
    balance: number,
    dueAmount: number,
    daysOverdue: number
  ) {
    const typeMap: Record<string, { title: string; content: string }> = {
      LOW_BALANCE: {
        title: '帳戶餘額不足',
        content: `您的帳戶餘額低於 NT$ 1,000，請及時儲值。`,
      },
      FIRST_WARNING: {
        title: '繳費首次提醒',
        content: `您的帳單已逾期 ${daysOverdue} 天，請盡快繳費。`,
      },
      WEEKLY_REMINDER: {
        title: '繳費週期提醒',
        content: `您的帳單已逾期 ${daysOverdue} 天，請盡快繳費。`,
      },
      FINAL_WARNING: {
        title: '最終繳費提醒',
        content: `您的帳單已逾期 ${daysOverdue} 天，請在停權前完成繳費。`,
      },
      SUSPEND_WARNING: {
        title: '帳號停權警告',
        content: `您的帳號將因逾期未繳費而被停權，請立即處理。`,
      },
    }

    const typeInfo = typeMap[reminderType] || {
      title: '繳費提醒',
      content: `請檢查您的帳單狀態。`,
    }

    // 獲取供應商主帳號
    // 這裡需要查詢供應商的主帳號用戶ID
    // 暫時使用 supplierId 作為 userId
    return NotificationService.createNotification({
      userId: supplierId, // 注意：這裡需要實際的用戶ID
      type: NotificationType.PAYMENT_REMINDER,
      title: typeInfo.title,
      content: typeInfo.content,
      data: {
        reminderType,
        balance,
        dueAmount,
        daysOverdue,
      },
      relatedId: supplierId,
      relatedType: 'Supplier',
      channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    })
  }

  /**
   * 採購推薦通知
   */
  static async sendPurchaseRecommendationNotification(
    userId: string,
    productId: string,
    productName: string,
    reason: string
  ) {
    return NotificationService.createNotification({
      userId,
      type: NotificationType.PURCHASE_RECOMMENDATION,
      title: '新採購推薦',
      content: `為您推薦：${productName}（${reason}）`,
      data: {
        productId,
        productName,
        reason,
      },
      relatedId: productId,
      relatedType: 'Product',
      channels: [NotificationChannel.IN_APP],
    })
  }

  /**
   * 供應商評分通知
   */
  static async sendSupplierRatingNotification(
    supplierUserId: string,
    raterId: string,
    ratingId: string,
    score: number,
    comment?: string
  ) {
    return NotificationService.createNotification({
      userId: supplierUserId,
      type: NotificationType.SUPPLIER_RATING,
      title: '收到新評分',
      content: `您收到了 ${score} 星評分${comment ? `：${comment}` : ''}`,
      data: {
        raterId,
        ratingId,
        score,
        comment,
      },
      relatedId: ratingId,
      relatedType: 'SupplierRating',
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    })
  }

  /**
   * 交貨預測通知
   */
  static async sendDeliveryPredictionNotification(
    userId: string,
    supplierId: string,
    supplierName: string,
    predictedDays: number,
    accuracy: number
  ) {
    return NotificationService.createNotification({
      userId,
      type: NotificationType.DELIVERY_PREDICTION,
      title: '交貨時間預測更新',
      content: `${supplierName} 的交貨時間預測為 ${predictedDays} 天（準確率：${accuracy}%）`,
      data: {
        supplierId,
        supplierName,
        predictedDays,
        accuracy,
      },
      relatedId: supplierId,
      relatedType: 'Supplier',
      channels: [NotificationChannel.IN_APP],
    })
  }

  /**
   * 安全警示通知
   */
  static async sendSecurityAlertNotification(
    userId: string,
    alertType: string,
    details: string
  ) {
    const alertMap: Record<string, string> = {
      LOGIN_ATTEMPT: '異常登入嘗試',
      PASSWORD_CHANGE: '密碼變更',
      PROFILE_UPDATE: '個人資料更新',
      SUSPICIOUS_ACTIVITY: '可疑活動',
    }

    const alertTitle = alertMap[alertType] || '安全警示'

    return NotificationService.createNotification({
      userId,
      type: NotificationType.SECURITY_ALERT,
      title: alertTitle,
      content: details,
      data: {
        alertType,
        details,
      },
      channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    })
  }

  /**
   * 系統公告通知
   */
  static async sendSystemAnnouncementToUser(
    userId: string,
    title: string,
    content: string,
    data?: Record<string, unknown>
  ) {
    return NotificationService.createNotification({
      userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title,
      content,
      data,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    })
  }
}