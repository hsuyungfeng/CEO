import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// 🔓 測試模式：禁用登入要求
const TEST_MODE = true;
import {
  findUserByTaxId,
  findUserByEmail,
  findOAuthAccount,
  findOAuthAccountsByEmail,
  createOAuthAccount,
  updateOAuthAccount,
  createTempOAuth,
  verifyPassword,
  isUserActive,
} from '@/lib/prisma-auth';

// 登入驗證 schema
const credentialsSchema = z.object({
  taxId: z.string().length(8, '統一編號必須是8位數字').regex(/^\d+$/, '統一編號必須是數字'),
  password: z.string().min(1, '密碼不能為空'),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || '',
          email: profile.email || '',
          image: profile.picture,
          emailVerified: profile.email_verified === true || profile.email_verified === 'true',
          taxId: '', // 將在 signIn callback 中設定
          role: 'MEMBER', // 預設角色
          status: 'ACTIVE', // 預設狀態
        };
      },
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'name email',
          response_mode: 'form_post',
        },
      },
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || '',
          email: profile.email || '',
          emailVerified: profile.email_verified === true || profile.email_verified === 'true',
          taxId: '', // Will be set in signIn callback
          role: 'MEMBER',
          status: 'ACTIVE',
        };
      },
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        taxId: { label: '統一編號', type: 'text' },
        password: { label: '密碼', type: 'password' },
      },
      async authorize(credentials, _request) {
        try {
          // 🔓 測試模式：跳過密碼驗證，直接以管理員身份登入
          if (TEST_MODE) {
            console.log('🔓 測試模式：使用管理員權限');
            return {
              id: 'test-admin-id',
              email: 'test@admin.com',
              name: '管理員',
              taxId: '88888888',
              role: 'ADMIN',
              status: 'ACTIVE',
            };
          }

          // 驗證輸入資料
          const validatedCredentials = credentialsSchema.safeParse(credentials);
          if (!validatedCredentials.success) {
            console.error('憑證驗證失敗:', validatedCredentials.error);
            return null;
          }

          const { taxId, password } = validatedCredentials.data;

          // 查找使用者 - 改用 PocketBase
          const user = await findUserByTaxId(taxId);

          if (!user) {
            console.error('使用者不存在:', taxId);
            return null;
          }

          // 檢查使用者狀態
          if (!isUserActive(user)) {
            console.error('帳號非啟用狀態:', user.status);
            return null;
          }

          // 驗證密碼
          const isPasswordValid = await verifyPassword(user, password);
          if (!isPasswordValid) {
            console.error('密碼驗證失敗');
            return null;
          }

          // 回傳使用者資料（排除密碼）
          return {
            id: user.id,
            name: user.name,
            taxId: user.taxId,
            email: user.email,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error('授權錯誤:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // 🔓 測試模式：自動以管理員身份登入
      if (TEST_MODE && account?.provider === 'credentials') {
        user.id = 'test-admin-id';
        user.role = 'ADMIN';
        user.status = 'ACTIVE';
        user.taxId = '88888888';
        return true;
      }

      // 處理 Google OAuth 登入
      if (account?.provider === 'google') {
        try {
          const { email, name, sub: providerId, picture } = profile as any;

          // 檢查是否已有 OAuth 帳戶連結 - 改用 PocketBase
          const existingOAuthResult = await findOAuthAccount('google', providerId);

          if (existingOAuthResult) {
            // 已有連結帳戶，更新使用者資訊
            const { account: oauthAccount, user: linkedUser } = existingOAuthResult;
            user.id = linkedUser.id;
            user.name = linkedUser.name ?? '';
            user.email = linkedUser.email;
            user.taxId = linkedUser.taxId ?? null;
            user.role = linkedUser.role;
            user.status = linkedUser.status;
            user.emailVerified = linkedUser.emailVerified;

            // 更新 OAuth 帳戶資訊
            await updateOAuthAccount(oauthAccount.id, {
              name,
              picture,
              accessToken: account.access_token ?? '',
              refreshToken: account.refresh_token ?? undefined,
              expiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : undefined,
            });

            return true;
          }

          // 檢查是否已有相同 email 的使用者 - 改用 PocketBase
          const existingUser = await findUserByEmail(email);

          if (existingUser) {
            // 連結現有使用者帳戶
            await createOAuthAccount(existingUser.id, 'google', providerId, {
              email,
              name,
              picture,
              accessToken: account.access_token ?? '',
              refreshToken: account.refresh_token ?? undefined,
              expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
            });

            user.id = existingUser.id;
            user.name = existingUser.name ?? '';
            user.email = existingUser.email;
            user.taxId = existingUser.taxId ?? null;
            user.role = existingUser.role;
            user.status = existingUser.status;
            user.emailVerified = existingUser.emailVerified;

            return true;
          }

          // 新使用者 - 需要兩階段註冊流程
          // 儲存 OAuth 資料到暫存，等待使用者補齊企業資料
          const tempOAuthData = {
            provider: 'google',
            providerId,
            email,
            name,
            picture,
            accessToken: account.access_token ?? '',
            refreshToken: account.refresh_token ?? undefined,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
          };

          // 將 OAuth 資料儲存到暫存表（1小時後過期） - 改用 PocketBase
          const tempOAuth = await createTempOAuth('google', providerId, {
            email,
            name: name || '',
            picture: picture || '',
            accessToken: account.access_token || '',
            refreshToken: account.refresh_token || '',
            tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
          });

          // 重定向到 OAuth 註冊頁面，帶上暫存 ID
          return `/register/oauth?id=${tempOAuth.id}`;
        } catch (error: unknown) {
           console.error('Google OAuth 登入錯誤:', error);
          return false;
        }
      }

      // 處理 Apple OAuth 登入
      if (account?.provider === 'apple') {
        try {
          const { email, sub: providerId, name } = profile as any;

          // 檢查是否已有 OAuth 帳戶連結 - 改用 PocketBase
          const existingOAuthResult = await findOAuthAccount('apple', providerId);

          if (existingOAuthResult) {
            // 已有連結帳戶，更新使用者資訊
            const { account: oauthAccount, user: linkedUser } = existingOAuthResult;
            user.id = linkedUser.id;
            user.name = linkedUser.name ?? '';
            user.email = linkedUser.email;
            user.taxId = linkedUser.taxId ?? null;
            user.role = linkedUser.role;
            user.status = linkedUser.status;
            user.emailVerified = linkedUser.emailVerified;

            // 更新 OAuth 帳戶資訊
            await updateOAuthAccount(oauthAccount.id, {
              name,
              accessToken: account.access_token ?? '',
              refreshToken: account.refresh_token ?? undefined,
              expiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : undefined,
            });

            return true;
          }

          // 檢查是否已有相同 email 的使用者 - 改用 PocketBase
          const existingUser = await findUserByEmail(email);

          if (existingUser) {
            // 連結現有使用者帳戶
            await createOAuthAccount(existingUser.id, 'apple', providerId, {
              email,
              name,
              accessToken: account.access_token ?? '',
              refreshToken: account.refresh_token ?? undefined,
              expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
            });

            user.id = existingUser.id;
            user.name = existingUser.name ?? '';
            user.email = existingUser.email;
            user.taxId = existingUser.taxId ?? null;
            user.role = existingUser.role;
            user.status = existingUser.status;
            user.emailVerified = existingUser.emailVerified;

            return true;
          }

          // 新使用者 - 需要兩階段註冊流程
          // 儲存 OAuth 資料到暫存，等待使用者補齊企業資料
          const tempOAuthData = {
            provider: 'apple',
            providerId,
            email,
            name,
            accessToken: account.access_token ?? '',
            refreshToken: account.refresh_token ?? undefined,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
          };

          // 將 OAuth 資料儲存到暫存表（1小時後過期） - 改用 PocketBase
          const tempOAuth = await createTempOAuth('apple', providerId, {
            email,
            name: name || '',
            accessToken: account.access_token || '',
            refreshToken: account.refresh_token || '',
            tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
          });

          // 重定向到 OAuth 註冊頁面，帶上暫存 ID
          return `/register/oauth?id=${tempOAuth.id}`;
        } catch (error: unknown) {
          console.error('Apple OAuth 登入錯誤:', error);
          return false;
        }
      }

      // 其他 provider 或 credentials 登入
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        console.log('[JWT Callback] User data available:', { id: user.id, role: user.role });
        token.id = user.id;
        token.taxId = user.taxId;
        token.role = user.role;
        token.status = user.status;
        token.emailVerified = user.emailVerified === true;
      } else {
        console.log('[JWT Callback] No user data, token might be refreshed');
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[Session Callback] Session creation:', { hasToken: !!token, tokenId: token?.id, sessionUser: !!session.user });
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.taxId = token.taxId as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        // NextAuth v5 uses Date|null for emailVerified; we store boolean in JWT
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).emailVerified = token.emailVerified as boolean;
        console.log('[Session Callback] Session populated successfully:', { id: session.user.id, role: session.user.role });
      } else {
        console.log('[Session Callback] Session not populated:', { hasSessionUser: !!session.user, hasToken: !!token });
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
    newUser: '/register/oauth', // OAuth 新使用者註冊頁面
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});