export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string; // Android channel
}

export interface SendNotificationResult {
  success: boolean;
  receiptId?: string;
  error?: string;
}

export interface DeviceTokenInfo {
  id: string;
  token: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';
  userId: string;
  deviceId?: string;
}