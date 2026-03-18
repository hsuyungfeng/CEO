import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { encode } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identityToken, authorizationCode, user } = body;

    if (!identityToken) {
      return NextResponse.json(
        { error: '缺少必要的身份令牌' },
        { status: 400 }
      );
    }

    // Validate Apple ID token (simplified - in production use proper validation)
    // Note: In production, you should validate the token with Apple's servers
    const decodedToken = jwt.decode(identityToken);
    
    if (!decodedToken || typeof decodedToken === 'string') {
      return NextResponse.json(
        { error: '無效的身份令牌' },
        { status: 400 }
      );
    }

    const { sub: providerId, email } = decodedToken as { sub: string; email: string };
    const appleUserId = providerId;
    const name = user?.name || '';

    // Check for existing OAuth account
    const existingOAuthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: 'apple',
          providerId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingOAuthAccount) {
      // Existing user - generate JWT token
      const user = existingOAuthAccount.user;
      
      // Check NEXTAUTH_SECRET
      if (!process.env.NEXTAUTH_SECRET) {
        console.error('NEXTAUTH_SECRET 未設定');
        return NextResponse.json(
          { error: '伺服器設定錯誤，請聯絡管理員' },
          { status: 500 }
        );
      }

      const tokenPayload = {
        id: user.id,
        taxId: user.taxId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      };

      const token = await encode({
        token: tokenPayload,
        secret: process.env.NEXTAUTH_SECRET,
        salt: 'next-auth.session-token',
      });

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          taxId: user.taxId,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      });
    }

    // Check for existing user with same email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Link Apple account to existing user
      await prisma.oAuthAccount.create({
        data: {
          provider: 'apple',
          providerId,
          userId: existingUser.id,
          appleUserId,
          email,
          name,
          identityToken,
          authorizationCode,
        },
      });

      // Check NEXTAUTH_SECRET
      if (!process.env.NEXTAUTH_SECRET) {
        console.error('NEXTAUTH_SECRET 未設定');
        return NextResponse.json(
          { error: '伺服器設定錯誤，請聯絡管理員' },
          { status: 500 }
        );
      }

      const tokenPayload = {
        id: existingUser.id,
        taxId: existingUser.taxId,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        status: existingUser.status,
        emailVerified: existingUser.emailVerified,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      };

      const token = await encode({
        token: tokenPayload,
        secret: process.env.NEXTAUTH_SECRET,
        salt: 'next-auth.session-token',
      });

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          taxId: existingUser.taxId,
          email: existingUser.email,
          role: existingUser.role,
          status: existingUser.status,
        },
      });
    }

    // New user - create temp OAuth data
    const tempOAuthData = {
      provider: 'apple',
      providerId,
      appleUserId,
      email,
      name,
      identityToken,
      authorizationCode,
    };

     const tempOAuth = await prisma.tempOAuth.create({
       data: {
         provider: 'apple',
         providerId,
         appleUserId,
         email,
         name: name || '',
         identityToken: identityToken || '',
         authorizationCode: authorizationCode || '',
         accessToken: '',
         data: JSON.stringify(tempOAuthData),
         expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
       },
     });

    return NextResponse.json({
      success: true,
      requiresRegistration: true,
      tempOAuthId: tempOAuth.id,
      email,
      name,
    });

  } catch (error) {
    console.error('Apple OAuth error:', error);
    return NextResponse.json(
      { error: 'Apple 登入失敗，請稍後再試' },
      { status: 500 }
    );
  }
}

/**
 * Handle other HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { error: '此端點僅支援 POST 方法。請使用 POST 請求並提供 Apple ID token' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: '此端點僅支援 POST 方法。請使用 POST 請求並提供 Apple ID token' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: '此端點僅支援 POST 方法。請使用 POST 請求並提供 Apple ID token' },
    { status: 405 }
  );
}