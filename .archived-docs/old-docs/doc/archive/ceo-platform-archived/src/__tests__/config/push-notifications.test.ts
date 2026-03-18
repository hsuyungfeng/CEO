import { pushNotificationConfig, validatePushNotificationConfig } from '@/config/push-notifications';
import { describe, expect, test, vi } from 'vitest';

describe('pushNotificationConfig', () => {
  test('should have expo access token from env', () => {
    expect(pushNotificationConfig.expo.accessToken).toBe('test-expo-access-token');
  });

  test('should have fcm server key from env', () => {
    expect(pushNotificationConfig.fcm.serverKey).toBe('test-fcm-server-key');
  });

  test('should have fcm sender id from env', () => {
    expect(pushNotificationConfig.fcm.senderId).toBe('test-fcm-sender-id');
  });
});

describe('validatePushNotificationConfig', () => {
  test('should not throw when EXPO_ACCESS_TOKEN is set', () => {
    expect(() => validatePushNotificationConfig()).not.toThrow();
  });

  test('should throw when EXPO_ACCESS_TOKEN is missing', async () => {
    const originalToken = process.env.EXPO_ACCESS_TOKEN;
    delete process.env.EXPO_ACCESS_TOKEN;
    
    // Reset modules so that the config module is reloaded with the new env var
    vi.resetModules();
    const { validatePushNotificationConfig: validate } = await import('@/config/push-notifications');
    
    expect(() => validate()).toThrow('EXPO_ACCESS_TOKEN is required for push notifications');
    
    // Restore env var and reset modules again to avoid affecting other tests
    process.env.EXPO_ACCESS_TOKEN = originalToken;
    vi.resetModules();
    // Re-import the original module to ensure subsequent imports are consistent
    await import('@/config/push-notifications');
  });
});