// Edge Runtime 相容的 NextAuth 設定（不含 bcrypt、Prisma 等 Node.js 專屬模組）
// 此設定用於 middleware，主要負責 JWT session 的讀取與傳遞
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  providers: [],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.taxId = (user as { taxId?: string }).taxId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as { role?: string }).role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.status = (user as { status?: string }).status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as { taxId?: string }).taxId = token.taxId as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as { role?: string }).role = token.role as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as { status?: string }).status = token.status as string;
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
