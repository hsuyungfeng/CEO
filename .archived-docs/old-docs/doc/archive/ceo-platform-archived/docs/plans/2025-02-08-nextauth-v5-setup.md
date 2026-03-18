# NextAuth.js v5 配置實施計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 為CEO團購電商平台配置NextAuth.js v5基礎認證系統，支援統一編號+密碼登入，包含角色權限管理

**Architecture:** 使用NextAuth.js v5的Credentials Provider進行統一編號登入，整合Prisma資料庫驗證，JWT token包含使用者角色資訊，Session管理符合最佳實踐

**Tech Stack:** NextAuth.js v5 beta, Prisma, PostgreSQL, bcryptjs, TypeScript

---

### Task 1: 建立Auth設定檔案

**Files:**
- Create: `ceo-platform/src/auth.ts`

**Step 1: 建立auth.ts檔案**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "統一編號登入",
      credentials: {
        taxId: { label: "統一編號", type: "text" },
        password: { label: "密碼", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.taxId || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { taxId: credentials.taxId as string }
          });

          if (!user || !user.isActive) {
            return null;
          }

          const isValid = await compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            taxId: user.taxId,
            role: user.role,
            isActive: user.isActive
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.taxId = user.taxId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.taxId = token.taxId as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
});
```

**Step 2: 建立TypeScript類型定義**

```typescript
// 在檔案末尾添加
declare module "next-auth" {
  interface User {
    id: string;
    taxId: string;
    role: string;
  }
  
  interface Session {
    user: {
      id: string;
      taxId: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    taxId: string;
    role: string;
  }
}
```

**Step 3: 驗證檔案建立**

Run: `ls -la ceo-platform/src/auth.ts`
Expected: 檔案存在

**Step 4: 類型檢查**

Run: `cd ceo-platform && npm run typecheck`
Expected: 無類型錯誤

**Step 5: Commit**

```bash
cd ceo-platform
git add src/auth.ts
git commit -m "feat: add NextAuth.js v5 configuration"
```

---

### Task 2: 建立API路由

**Files:**
- Create: `ceo-platform/src/app/api/auth/[...nextauth]/route.ts`

**Step 1: 建立目錄結構**

```bash
mkdir -p ceo-platform/src/app/api/auth/[...nextauth]
```

**Step 2: 建立route.ts檔案**

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

**Step 3: 驗證檔案建立**

Run: `ls -la ceo-platform/src/app/api/auth/[...nextauth]/route.ts`
Expected: 檔案存在

**Step 4: 類型檢查**

Run: `cd ceo-platform && npm run typecheck`
Expected: 無類型錯誤

**Step 5: Commit**

```bash
cd ceo-platform
git add src/app/api/auth/[...nextauth]/route.ts
git commit -m "feat: add NextAuth API routes"
```

---

### Task 3: 建立登入頁面

**Files:**
- Create: `ceo-platform/src/app/(auth)/signin/page.tsx`
- Create: `ceo-platform/src/app/(auth)/signin/signin-form.tsx`

**Step 1: 建立登入頁面組件**

```tsx
// ceo-platform/src/app/(auth)/signin/page.tsx
import SigninForm from "./signin-form";

export default function SigninPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            CEO團購平台登入
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            請使用統一編號和密碼登入
          </p>
        </div>
        <SigninForm />
      </div>
    </div>
  );
}
```

**Step 2: 建立登入表單組件**

```tsx
// ceo-platform/src/app/(auth)/signin/signin-form.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SigninForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    taxId: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        taxId: formData.taxId,
        password: formData.password,
        redirect: false
      });

      if (result?.error) {
        setError("登入失敗，請檢查統一編號和密碼");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setError("登入時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="taxId" className="sr-only">
            統一編號
          </label>
          <input
            id="taxId"
            name="taxId"
            type="text"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="統一編號"
            value={formData.taxId}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            密碼
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="密碼"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "登入中..." : "登入"}
        </button>
      </div>
    </form>
  );
}
```

**Step 3: 驗證檔案建立**

Run: `ls -la ceo-platform/src/app/(auth)/signin/`
Expected: page.tsx 和 signin-form.tsx 存在

**Step 4: 類型檢查**

Run: `cd ceo-platform && npm run typecheck`
Expected: 無類型錯誤

**Step 5: Commit**

```bash
cd ceo-platform
git add src/app/(auth)/signin/
git commit -m "feat: add signin page with form"
```

---

### Task 4: 建立Auth Provider

**Files:**
- Create: `ceo-platform/src/components/auth-provider.tsx`
- Modify: `ceo-platform/src/app/layout.tsx`

**Step 1: 建立Auth Provider組件**

```tsx
// ceo-platform/src/components/auth-provider.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**Step 2: 更新layout.tsx**

```tsx
// ceo-platform/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CEO團購平台",
  description: "企業團購電商平台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**Step 3: 驗證修改**

Run: `cd ceo-platform && npm run typecheck`
Expected: 無類型錯誤

**Step 4: Commit**

```bash
cd ceo-platform
git add src/components/auth-provider.tsx src/app/layout.tsx
git commit -m "feat: add auth provider to layout"
```

---

### Task 5: 建立登出功能

**Files:**
- Create: `ceo-platform/src/components/signout-button.tsx`
- Modify: `ceo-platform/src/app/layout.tsx`

**Step 1: 建立登出按鈕組件**

```tsx
// ceo-platform/src/components/signout-button.tsx
"use client";

import { signOut } from "next-auth/react";

export default function SignoutButton() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
    >
      登出
    </button>
  );
}
```

**Step 2: 更新layout.tsx添加導航欄**

```tsx
// 在ceo-platform/src/app/layout.tsx的AuthProvider內添加
import Navbar from "@/components/navbar";

// ... 在return語句中
<AuthProvider>
  <Navbar />
  {children}
</AuthProvider>
```

**Step 3: 建立導航欄組件**

```tsx
// ceo-platform/src/components/navbar.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import SignoutButton from "./signout-button";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-800">
                CEO團購平台
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            {session ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {session.user?.name} ({session.user?.role})
                </span>
                <SignoutButton />
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                登入
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

**Step 4: 驗證修改**

Run: `cd ceo-platform && npm run typecheck`
Expected: 無類型錯誤

**Step 5: Commit**

```bash
cd ceo-platform
git add src/components/signout-button.tsx src/components/navbar.tsx src/app/layout.tsx
git commit -m "feat: add signout functionality and navbar"
```

---

### Task 6: 測試認證功能

**Files:**
- Test: 手動測試登入流程

**Step 1: 啟動開發伺服器**

Run: `cd ceo-platform && npm run dev`
Expected: 伺服器啟動在 http://localhost:3000

**Step 2: 測試登入頁面**

訪問: http://localhost:3000/auth/signin
Expected: 顯示登入表單

**Step 3: 測試API端點**

訪問: http://localhost:3000/api/auth/signin
Expected: 顯示NextAuth登入頁面

**Step 4: 測試登入功能**

使用種子資料中的測試帳號登入:
- 統一編號: 12345678
- 密碼: password123
Expected: 登入成功，顯示使用者名稱和角色

**Step 5: 測試登出功能**

點擊登出按鈕
Expected: 返回登入頁面

**Step 6: Commit**

```bash
cd ceo-platform
git commit -m "test: verify authentication flow works"
```

---

### Task 7: 建立Middleware保護路由

**Files:**
- Create: `ceo-platform/src/middleware.ts`

**Step 1: 建立middleware檔案**

```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAuthPage = nextUrl.pathname.startsWith("/auth");

  // 如果未登入且訪問非公開頁面，重定向到登入頁面
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl));
  }

  // 如果已登入且訪問登入頁面，重定向到首頁
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
```

**Step 2: 驗證middleware**

Run: `cd ceo-platform && npm run typecheck`
Expected: 無類型錯誤

**Step 3: 測試middleware功能**

1. 登出後訪問首頁
Expected: 重定向到登入頁面

2. 登入後訪問登入頁面
Expected: 重定向到首頁

**Step 4: Commit**

```bash
cd ceo-platform
git add src/middleware.ts
git commit -m "feat: add authentication middleware"
```

---

### Task 8: 建立角色權限工具

**Files:**
- Create: `ceo-platform/src/lib/auth-utils.ts`

**Step 1: 建立權限工具檔案**

```typescript
import { auth } from "@/auth";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("需要登入才能訪問此頁面");
  }
  return user;
}

export async function requireRole(requiredRole: string) {
  const user = await requireAuth();
  if (user.role !== requiredRole) {
    throw new Error(`需要${requiredRole}權限才能訪問此頁面`);
  }
  return user;
}

export function hasRole(user: any, requiredRole: string) {
  return user?.role === requiredRole;
}

export function isAdmin(user: any) {
  return hasRole(user, "ADMIN") || hasRole(user, "SUPER_ADMIN");
}
```

**Step 2: 建立管理員路由保護範例**

```typescript
// ceo-platform/src/app/admin/page.tsx
import { requireRole } from "@/lib/auth-utils";

export default async function AdminPage() {
  const user = await requireRole("ADMIN");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">管理員面板</h1>
      <p>歡迎，{user.name} ({user.role})</p>
      {/* 管理員功能 */}
    </div>
  );
}
```

**Step 3: 驗證工具**

Run: `cd ceo-platform && npm run typecheck`
Expected: 無類型錯誤

**Step 4: Commit**

```bash
cd ceo-platform
git add src/lib/auth-utils.ts src/app/admin/page.tsx
git commit -m "feat: add auth utilities and role-based protection"
```

---

### Task 9: 更新環境變數文檔

**Files:**
- Modify: `ceo-platform/.env.example`

**Step 1: 更新環境變數範例**

```bash
# Database - PostgreSQL 16
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"

# Authentication
BCRYPT_SALT_ROUNDS=12

# Application
NODE_ENV=development
```

**Step 2: 驗證環境變數**

Run: `cd ceo-platform && cat .env.local`
Expected: 包含NEXTAUTH_URL和NEXTAUTH_SECRET

**Step 3: Commit**

```bash
cd ceo-platform
git add .env.example
git commit -m "docs: update environment variables documentation"
```

---

### Task 10: 最終測試和驗證

**Step 1: 運行完整類型檢查**

Run: `cd ceo-platform && npm run typecheck`
Expected: 無類型錯誤

**Step 2: 運行ESLint檢查**

Run: `cd ceo-platform && npm run lint`
Expected: 無錯誤或警告

**Step 3: 測試完整流程**

1. 訪問首頁 (未登入) → 重定向到登入頁面
2. 使用測試帳號登入 → 成功登入，顯示導航欄
3. 訪問管理員頁面 (非管理員) → 顯示權限錯誤
4. 點擊登出 → 返回登入頁面

**Step 4: 最終Commit**

```bash
cd ceo-platform
git commit -m "chore: final verification of NextAuth.js v5 setup"
```

---

**計劃完成！** NextAuth.js v5配置已完整實施，包含：
1. Auth設定檔案
2. API路由
3. 登入頁面
4. Auth Provider
5. 登出功能
6. Middleware保護
7. 角色權限工具
8. 環境變數配置
9. 完整測試流程