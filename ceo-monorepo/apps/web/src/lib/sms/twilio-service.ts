// Twilio SMS 服務 - 用於發送簡訊通知
// 支援多種通知類型：訂單狀態、付款提醒、安全警示等

import { NotificationType } from '@prisma/client';

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  enabled: boolean;
}

export interface SmsMessage {
  to: string;
  body: string;
  from?: string;
  statusCallback?: string;
}

export interface SmsDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
  timestamp?: Date;
}

interface TwilioMessageInstance {
  sid: string;
  status: string;
  errorMessage?: string;
  dateCreated: string;
}

type TwilioMessagesResource = {
  create: (params: { body: string; from: string; to: string; statusCallback?: string }) => Promise<TwilioMessageInstance>;
} & ((sid: string) => { fetch: () => Promise<TwilioMessageInstance> });

interface TwilioClient {
  messages: TwilioMessagesResource;
}

export class TwilioSmsService {
  private config: SmsConfig;
  private twilioClient: TwilioClient | null = null;

  constructor(config: SmsConfig) {
    this.config = config;

    if (config.enabled && config.accountSid && config.authToken) {
      try {
        // 動態導入 Twilio 客戶端 - 使用延遲加載以支持 Turbopack
        // eslint-disable-next-line global-require
        const twilioModule = (() => {
          try {
            // 嘗試在運行時導入 twilio
            return require('twilio');
          } catch {
            return null;
          }
        })();

        if (twilioModule) {
          this.twilioClient = twilioModule(config.accountSid, config.authToken);
        } else {
          console.warn('Twilio 模組未安裝，SMS 功能將被禁用');
          this.config.enabled = false;
        }
      } catch (error) {
        console.warn('Twilio 客戶端初始化失敗，SMS 功能將被禁用:', error);
        this.config.enabled = false;
      }
    } else {
      console.warn('Twilio 配置不完整，SMS 功能將被禁用');
      this.config.enabled = false;
    }
  }

  /**
   * 發送 SMS 訊息
   */
  async sendSms(message: SmsMessage): Promise<SmsDeliveryResult> {
    if (!this.config.enabled || !this.twilioClient) {
      return {
        success: false,
        error: 'SMS 服務未啟用或配置不完整'
      };
    }

    try {
      const fromNumber = message.from || this.config.phoneNumber;
      
      const result = await this.twilioClient.messages.create({
        body: message.body,
        from: fromNumber,
        to: message.to,
        statusCallback: message.statusCallback || `${process.env.NEXTAUTH_URL}/api/sms/callback`
      });

      console.log(`SMS 發送成功: ${result.sid} 至 ${message.to}`);

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        timestamp: new Date()
      };
    } catch (error: unknown) {
      console.error(`SMS 發送失敗至 ${message.to}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤',
        status: 'failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * 發送通知類 SMS
   */
  async sendNotificationSms(
    phoneNumber: string,
    notificationType: NotificationType,
    title: string,
    content: string,
    data?: Record<string, unknown>
  ): Promise<SmsDeliveryResult> {
    // 格式化 SMS 內容
    const smsBody = this.formatNotificationBody(notificationType, title, content, data);
    
    // 檢查電話號碼格式
    const formattedPhoneNumber = this.formatPhoneNumber(phoneNumber);
    if (!formattedPhoneNumber) {
      return {
        success: false,
        error: '無效的電話號碼格式'
      };
    }

    return this.sendSms({
      to: formattedPhoneNumber,
      body: smsBody
    });
  }

  /**
   * 批量發送 SMS
   */
  async sendBulkSms(messages: SmsMessage[]): Promise<SmsDeliveryResult[]> {
    const results: SmsDeliveryResult[] = [];
    
    // 限制並發發送數量，避免超過 Twilio 限制
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(message => this.sendSms(message))
      );
      results.push(...batchResults);
      
      // 批次間延遲，避免速率限制
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * 檢查 SMS 發送狀態
   */
  async getMessageStatus(messageId: string): Promise<SmsDeliveryResult> {
    if (!this.config.enabled || !this.twilioClient) {
      return {
        success: false,
        error: 'SMS 服務未啟用'
      };
    }

    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      
      return {
        success: message.status !== 'failed',
        messageId: message.sid,
        status: message.status,
        timestamp: new Date(message.dateCreated),
        error: message.errorMessage || undefined
      };
    } catch (error: unknown) {
      console.error(`獲取 SMS 狀態失敗 ${messageId}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }

  /**
   * 格式化通知內容
   */
  private formatNotificationBody(
    notificationType: NotificationType,
    title: string,
    content: string,
    data?: Record<string, unknown>
  ): string {
    const platformName = 'CEO團購平台';
    let prefix = '';
    
    // 根據通知類型添加前綴
    switch (notificationType) {
      case NotificationType.PAYMENT_REMINDER:
        prefix = '💰 付款提醒';
        break;
      case NotificationType.ORDER_STATUS:
        prefix = '📦 訂單狀態';
        break;
      case NotificationType.SECURITY_ALERT:
        prefix = '🔒 安全警示';
        break;
      case NotificationType.SUPPLIER_APPLICATION:
        prefix = '🏢 供應商申請';
        break;
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        prefix = '📢 系統公告';
        break;
      default:
        prefix = '📱 平台通知';
    }
    
    // 構建 SMS 內容
    let body = `${prefix}\n`;
    body += `${title}\n`;
    body += `${content}\n`;
    
    // 添加相關數據
    if (data) {
      if (data.orderNo) {
        body += `訂單編號: ${data.orderNo}\n`;
      }
      if (data.dueAmount) {
        body += `應繳金額: NT$ ${data.dueAmount}\n`;
      }
      if (data.daysOverdue) {
        body += `逾期天數: ${data.daysOverdue} 天\n`;
      }
    }
    
    body += `\n${platformName}`;
    
    // SMS 長度限制（160 字元）
    if (body.length > 160) {
      body = body.substring(0, 157) + '...';
    }
    
    return body;
  }

  /**
   * 格式化電話號碼
   */
  private formatPhoneNumber(phoneNumber: string): string | null {
    if (!phoneNumber) return null;
    
    // 移除所有非數字字元
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // 台灣手機號碼格式檢查
    if (cleaned.startsWith('09') && cleaned.length === 10) {
      // 台灣手機號碼：+886 9XXXXXXXX
      return `+886${cleaned.substring(1)}`;
    }
    
    // 國際號碼檢查（已包含 +）
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // 其他格式，假設為國際號碼
    return `+${cleaned}`;
  }

  /**
   * 驗證電話號碼格式
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    if (!formatted) return false;
    
    // 基本格式檢查
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(formatted);
  }

  /**
   * 獲取服務狀態
   */
  getServiceStatus(): {
    enabled: boolean;
    configured: boolean;
    clientReady: boolean;
  } {
    return {
      enabled: this.config.enabled,
      configured: !!(this.config.accountSid && this.config.authToken && this.config.phoneNumber),
      clientReady: !!this.twilioClient
    };
  }
}

// 單例實例
let twilioSmsServiceInstance: TwilioSmsService | null = null;

/**
 * 獲取 Twilio SMS 服務實例
 */
export function getTwilioSmsService(): TwilioSmsService {
  if (!twilioSmsServiceInstance) {
    const config: SmsConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      enabled: process.env.SMS_ENABLED === 'true'
    };
    
    twilioSmsServiceInstance = new TwilioSmsService(config);
  }
  
  return twilioSmsServiceInstance;
}

/**
 * 發送 SMS 通知的便捷函數
 */
export async function sendSmsNotification(
  phoneNumber: string,
  notificationType: NotificationType,
  title: string,
  content: string,
  data?: Record<string, any>
): Promise<SmsDeliveryResult> {
  const service = getTwilioSmsService();
  return service.sendNotificationSms(phoneNumber, notificationType, title, content, data);
}