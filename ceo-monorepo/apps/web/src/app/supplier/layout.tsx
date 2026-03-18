'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SupplierSidebar from '@/components/supplier/supplier-sidebar';
import { useSession } from 'next-auth/react';

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  taxId?: string | null;
}

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isSupplier, setIsSupplier] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSupplierAuth() {
      try {
        // 檢查當前 session
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (response.ok && data.user) {
          const currentUser = data.user;
          setUser(currentUser);

          // 檢查是否為供應商（是否有 UserSupplier 關係）
          const supplierCheckResponse = await fetch('/api/supplier/profile');
          if (supplierCheckResponse.ok) {
            const supplierData = await supplierCheckResponse.json();
            if (supplierData.supplier || supplierData.data?.supplier) {
              setIsSupplier(true);
              setLoading(false);
              return;
            }
          }

          // 不是供應商，重定向到帳戶設置
          console.warn('[SupplierLayout] 使用者不是供應商，重定向到帳戶設置');
          router.push('/supplier/account/setup');
          return;
        }

        // 未登入，重定向到登入頁面
        router.push('/login?redirect=/supplier/dashboard');
      } catch (error) {
        console.error('[SupplierLayout] 檢查認證錯誤:', error);
        router.push('/login?redirect=/supplier/dashboard');
      } finally {
        setLoading(false);
      }
    }

    checkSupplierAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">檢查權限中...</p>
        </div>
      </div>
    );
  }

  if (!user || !isSupplier) {
    return null; // 正在重定向
  }

  const safeUser = {
    id: user?.id || '',
    name: user?.name || '供應商',
    email: user?.email || '',
    role: user?.role || 'MEMBER',
    taxId: user?.taxId || '',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SupplierSidebar user={safeUser} />
      <div className="lg:pl-64 transition-all duration-300">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              供應商後台
            </h1>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {safeUser.name}
            </div>
          </div>
        </div>
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
