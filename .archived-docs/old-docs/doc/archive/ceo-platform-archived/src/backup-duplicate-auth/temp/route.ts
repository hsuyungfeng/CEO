import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少暫存 ID' },
        { status: 400 }
      );
    }

    // 取得暫存 OAuth 資料
    const tempOAuth = await prisma.tempOAuth.findUnique({
      where: { id },
    });

    if (!tempOAuth) {
      return NextResponse.json(
        { error: '暫存資料不存在或已過期' },
        { status: 404 }
      );
    }

    // 檢查是否過期
    if (tempOAuth.expiresAt < new Date()) {
      // 刪除過期資料
      await prisma.tempOAuth.delete({
        where: { id },
      });
      
      return NextResponse.json(
        { error: '暫存資料已過期，請重新嘗試' },
        { status: 410 }
      );
    }

    // 解析 JSON 資料
    const oauthData = JSON.parse(tempOAuth.data);

    return NextResponse.json({
      id: tempOAuth.id,
      provider: tempOAuth.provider,
      email: tempOAuth.email,
      name: tempOAuth.name,
      picture: tempOAuth.picture,
      ...oauthData,
    });

  } catch (error) {
    console.error('取得暫存 OAuth 資料錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}