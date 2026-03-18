import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { DevicePlatform } from '@prisma/client';
import { z } from 'zod';
import { logger } from '@/lib/logger'

const tokenSchema = z.object({
  token: z.string().min(10),
  platform: z.nativeEnum(DevicePlatform),
  deviceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const body = await request.json();
    const validated = tokenSchema.parse(body);

    // Check if token already exists for this user
    const existing = await prisma.deviceToken.findFirst({
      where: {
        userId: session.user.id,
        token: validated.token,
      },
    });

    if (existing) {
      // Update existing token
      const updated = await prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          platform: validated.platform,
          deviceId: validated.deviceId,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ 
        message: '裝置令牌已更新', 
        token: updated 
      });
    }

    // Create new token
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId: session.user.id,
        token: validated.token,
        platform: validated.platform,
        deviceId: validated.deviceId,
        isActive: true,
      },
    });

    return NextResponse.json({ 
      message: '裝置令牌已註冊', 
      token: deviceToken 
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Token registration error');
    return NextResponse.json({ 
      error: '註冊失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 400 });
  }
}