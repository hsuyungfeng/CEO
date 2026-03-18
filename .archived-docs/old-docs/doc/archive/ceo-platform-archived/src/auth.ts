import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

// 登入驗證 schema
const credentialsSchema = z.object({
  identifier: z.string().min(1, '請輸入電子郵件或手機號碼'),
  password: z.string().min(1, '密碼不能為空'),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: '電子郵件或手機號碼', type: 'text' },
        password: { label: '密碼', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // 驗證輸入資料
          const validatedCredentials = credentialsSchema.safeParse(credentials);
          if (!validatedCredentials.success) {
            console.error('憑證驗證失敗:', validatedCredentials.error);
            return null;
          }

          const { identifier, password } = validatedCredentials.data;

          // 查找使用者 (支援電子郵件或手機號碼)
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: identifier },
                { phone: identifier }
              ]
            },
          });

          if (!user || !user.password) {
            console.error('使用者不存在或未設定密碼:', identifier);
            return null;
          }

          // 檢查使用者狀態
          if (user.status !== 'ACTIVE') {
            console.error('帳號非啟用狀態:', user.status);
            return null;
          }

          // 驗證密碼
          const isPasswordValid = await bcrypt.compare(password, user.password as string);
          if (!isPasswordValid) {
            console.error('密碼驗證失敗');
            return null;
          }

          // 回傳使用者資料（排除密碼）
          return {
            id: user.id,
            name: user.name,
            taxId: user.taxId as string,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.taxId = user.taxId as string;
        token.role = user.role;
        token.status = user.status;
        token.emailVerified = user.emailVerified as boolean;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string;
        (session.user as any).taxId = token.taxId as string;
        (session.user as any).role = token.role as string;
        (session.user as any).status = token.status as string;
        (session.user as any).emailVerified = token.emailVerified as boolean;
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
});