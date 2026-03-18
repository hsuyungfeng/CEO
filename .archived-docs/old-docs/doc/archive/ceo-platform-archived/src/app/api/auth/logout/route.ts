import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/auth';
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // 執行登出
    await signOut({ redirect: false });

    return NextResponse.json(
      { message: '登出成功' },
      { 
        status: 200,
        headers: {
          // 清除 Session Cookie
          'Set-Cookie': 'next-auth.session-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        },
      }
    );

  } catch (error) {
    logger.error({ err: error }, '登出錯誤');
    return NextResponse.json(
      { error: '登出失敗，請稍後再試' },
      { status: 500 }
    );
  }
}