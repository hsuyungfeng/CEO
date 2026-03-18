import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ExpoPushNotificationService } from './expo-service';
import type { SendNotificationResult } from './types';

export class NotificationService {
  private expoService: ExpoPushNotificationService;

  constructor() {
    this.expoService = new ExpoPushNotificationService();
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    logger.info({ userId }, 'Sending notification to user');
    const tokens = await prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      logger.warn({ userId }, 'No active device tokens found for user');
      return [];
    }

    const results: Array<SendNotificationResult & { tokenId: string }> = [];
    for (const token of tokens) {
      logger.debug({ tokenId: token.id, platform: token.platform }, 'Sending notification to token');
      const result = await this.expoService.sendNotification({
        to: token.token,
        title,
        body,
        data,
      });
      results.push({ tokenId: token.id, ...result });
      if (result.success) {
        logger.debug({ tokenId: token.id, receiptId: result.receiptId }, 'Notification sent successfully');
      } else {
        logger.warn({ tokenId: token.id, error: result.error }, 'Failed to send notification');
      }
    }

    logger.info({ userId, total: tokens.length, successes: results.filter(r => r.success).length }, 'User notification sending completed');
    return results;
  }

  async sendToAllUsers(title: string, body: string, data?: Record<string, unknown>) {
    logger.info('Sending notification to all users');
    const tokens = await prisma.deviceToken.findMany({
      where: { isActive: true },
      take: 100, // Limit for batch sending
    });

    if (tokens.length === 0) {
      logger.warn('No active device tokens found');
      return [];
    }

    const results: Array<SendNotificationResult & { tokenId: string }> = [];
    for (const token of tokens) {
      logger.debug({ tokenId: token.id, platform: token.platform }, 'Sending notification to token');
      const result = await this.expoService.sendNotification({
        to: token.token,
        title,
        body,
        data,
      });
      results.push({ tokenId: token.id, ...result });
      if (result.success) {
        logger.debug({ tokenId: token.id, receiptId: result.receiptId }, 'Notification sent successfully');
      } else {
        logger.warn({ tokenId: token.id, error: result.error }, 'Failed to send notification');
      }
    }

    logger.info({ total: tokens.length, successes: results.filter(r => r.success).length }, 'Broadcast notification sending completed');
    return results;
  }
}