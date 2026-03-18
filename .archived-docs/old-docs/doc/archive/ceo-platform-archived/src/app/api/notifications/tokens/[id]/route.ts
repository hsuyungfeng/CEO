import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logger } from '@/lib/logger'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify token belongs to user
    const token = await prisma.deviceToken.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!token) {
      return NextResponse.json({ error: '裝置令牌不存在' }, { status: 404 });
    }

    await prisma.deviceToken.delete({ where: { id } });

    return NextResponse.json({ message: '裝置令牌已刪除' });
  } catch (error) {
    logger.error({ err: error }, 'Token deletion error');
    return NextResponse.json({ 
      error: '刪除失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 400 });
  }
}