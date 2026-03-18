import { ExpoPushNotificationService } from '@/lib/push-notifications/expo-service';
import { describe, expect, test, vi, beforeAll } from 'vitest';

describe('ExpoPushNotificationService', () => {
  let service: ExpoPushNotificationService;

  beforeAll(() => {
    process.env.EXPO_ACCESS_TOKEN = 'test-token';
    service = new ExpoPushNotificationService();
  });

  test('should validate Expo push tokens', () => {
    expect(service.validateToken('ExponentPushToken[xxxxxxxxxxxx]')).toBe(true);
    expect(service.validateToken('invalid-token')).toBe(false);
  });

  test('should throw error when EXPO_ACCESS_TOKEN is missing', async () => {
    const originalToken = process.env.EXPO_ACCESS_TOKEN;
    delete process.env.EXPO_ACCESS_TOKEN;
    
    vi.resetModules();
    const { ExpoPushNotificationService: ExpoService } = await import('@/lib/push-notifications/expo-service');
    
    expect(() => new ExpoService()).toThrow('EXPO_ACCESS_TOKEN is not configured');
    
    // Restore
    process.env.EXPO_ACCESS_TOKEN = originalToken;
    vi.resetModules();
    await import('@/lib/push-notifications/expo-service');
  });
});