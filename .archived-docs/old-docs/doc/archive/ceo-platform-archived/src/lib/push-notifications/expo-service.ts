import { Expo } from 'expo-server-sdk';
import { pushNotificationConfig } from '@/config/push-notifications';
import type { PushNotificationPayload, SendNotificationResult } from './types';

export class ExpoPushNotificationService {
  private expo: Expo;

  constructor() {
    const accessToken = pushNotificationConfig.expo.accessToken;
    if (!accessToken) {
      throw new Error('EXPO_ACCESS_TOKEN is not configured');
    }
    this.expo = new Expo({ accessToken });
  }

  async sendNotification(payload: PushNotificationPayload): Promise<SendNotificationResult> {
    try {
      const chunks = this.expo.chunkPushNotifications([payload]);
      const receipts = [];
      
      for (const chunk of chunks) {
        const chunkReceipts = await this.expo.sendPushNotificationsAsync(chunk);
        receipts.push(...chunkReceipts);
      }

      const receipt = receipts[0];
      if (receipt.status === 'ok') {
        return { success: true, receiptId: receipt.id };
      } else {
        return { 
          success: false, 
          error: receipt.details?.error || 'Unknown error' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  validateToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }
}