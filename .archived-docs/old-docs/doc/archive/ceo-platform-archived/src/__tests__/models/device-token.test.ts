import { prisma } from '@/lib/prisma';
import { describe, expect, test, afterEach } from 'vitest';

describe('DeviceToken Model', () => {
  let userId: string;
  let deviceTokenId: string;

  afterEach(async () => {
    if (deviceTokenId) {
      await prisma.deviceToken.delete({ where: { id: deviceTokenId } }).catch(() => {});
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  test('should create device token with required fields', async () => {
    const email = `test-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: { email, password: 'temp' }
    });
    userId = user.id;
    
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId: user.id,
        token: `ExponentPushToken[xxxxxxxxxxxx${Date.now()}]`,
        platform: 'IOS',
        deviceId: 'device123',
        isActive: true
      }
    });
    deviceTokenId = deviceToken.id;
    
    expect(deviceToken.token).toContain('ExponentPushToken[');
    expect(deviceToken.platform).toBe('IOS');
  });
});