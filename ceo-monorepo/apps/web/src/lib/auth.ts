import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// 登入驗證 schema
const credentialsSchema = z.object({
  taxId: z.string().length(8, '統一編號必須是8位數字').regex(/^\d+$/, '統一編號必須是數字'),
  password: z.string().min(1, '密碼不能為空'),
});

export const authOptions = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        taxId: { label: '統一編號', type: 'text' },
        password: { label: '密碼', type: 'password' },
      },
      async authorize(credentials, _request) {
        try {
          // 驗證輸入資料
          const validatedCredentials = credentialsSchema.safeParse(credentials);
          if (!validatedCredentials.success) {
            console.error('憑證驗證失敗:', validatedCredentials.error);
            return null;
          }

          const { taxId, password } = validatedCredentials.data;

          // 查找使用者
          const user = await prisma.user.findUnique({
            where: { taxId },
          });

          if (!user) {
            console.error('使用者不存在:', taxId);
            return null;
          }

          // 檢查使用者狀態
          if (user.status !== 'ACTIVE') {
            console.error('帳號非啟用狀態:', user.status);
            return null;
          }

          // 驗證密碼（檢查密碼是否存在）
          if (!user.password) {
            console.error('使用者沒有設定密碼（可能是 OAuth 登入）');
            return null;
          }
          const isPasswordValid = await bcrypt.compare(password, user.password);
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
    async jwt({ token, user }: { token: Record<string, unknown>; user?: Record<string, unknown> }) {
      if (user) {
        token.id = user.id;
        token.taxId = user.taxId;
        token.role = user.role;
        token.status = user.status;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }: { session: Record<string, unknown> & { user?: Record<string, unknown> }; token: Record<string, unknown> }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.taxId = token.taxId;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};