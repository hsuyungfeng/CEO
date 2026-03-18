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
      async authorize(credentials) {
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
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.taxId = user.taxId as string;
        token.role = user.role;
        token.status = user.status;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.taxId = token.taxId as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.emailVerified = token.emailVerified as boolean;
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