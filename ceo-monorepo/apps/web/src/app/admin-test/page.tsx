'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTestPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (response.ok && data.user) {
          setUser(data.user);
          
          // 檢查是否為管理員
          const isAdmin = data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN';
          if (!isAdmin) {
            setTestResults(prev => ({ ...prev, '管理員權限': false }));
          } else {
            setTestResults(prev => ({ ...prev, '管理員權限': true }));
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('檢查認證錯誤:', error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const runTests = async () => {
    const results: Record<string, boolean> = {};

    // 測試 1: 管理員 API 訪問
    try {
      const response = await fetch('/api/admin/dashboard');
      results['管理員 API 訪問'] = response.ok;
    } catch {
      results['管理員 API 訪問'] = false;
    }

    // 測試 2: 管理員頁面訪問
    try {
      const response = await fetch('/admin', { method: 'HEAD' });
      results['管理員頁面訪問'] = response.ok;
    } catch {
      results['管理員頁面訪問'] = false;
    }

    // 測試 3: 會員管理頁面訪問
    try {
      const response = await fetch('/admin/members', { method: 'HEAD' });
      results['會員管理頁面訪問'] = response.ok;
    } catch {
      results['會員管理頁面訪問'] = false;
    }

    // 測試 4: 商品管理頁面訪問
    try {
      const response = await fetch('/admin/products', { method: 'HEAD' });
      results['商品管理頁面訪問'] = response.ok;
    } catch {
      results['商品管理頁面訪問'] = false;
    }

    setTestResults(results);
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">管理員後台測試</h1>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">管理員後台功能測試</h1>
      
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">當前用戶資訊</h2>
        {user ? (
          <div className="space-y-2">
            <p><strong>名稱:</strong> {user.name || '未設定'}</p>
            <p><strong>統一編號:</strong> {user.taxId}</p>
            <p><strong>電子郵件:</strong> {user.email || '未設定'}</p>
            <p><strong>角色:</strong> <span className={`font-bold ${user.role === 'SUPER_ADMIN' ? 'text-green-600' : user.role === 'ADMIN' ? 'text-blue-600' : 'text-gray-600'}`}>{user.role}</span></p>
            <p><strong>狀態:</strong> {user.status}</p>
          </div>
        ) : (
          <p className="text-red-600">未登入</p>
        )}
      </div>

      <div className="mb-8">
        <button
          onClick={runTests}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          運行管理員功能測試
        </button>
        <p className="text-sm text-gray-600 mt-2">
          測試所有管理員後台功能的訪問權限
        </p>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">測試結果</h2>
          <div className="space-y-2">
            {Object.entries(testResults).map(([test, passed]) => (
              <div key={test} className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-3 ${passed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>{test}: </span>
                <span className={`ml-2 font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
                  {passed ? '✅ 通過' : '❌ 失敗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          disabled={!user}
        >
          <h3 className="font-semibold mb-2">管理員儀表板</h3>
          <p className="text-sm text-gray-600">訪問管理員主控台</p>
          <p className="text-xs text-gray-500 mt-1">路徑: /admin</p>
        </button>

        <button
          onClick={() => router.push('/admin/members')}
          className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          disabled={!user}
        >
          <h3 className="font-semibold mb-2">會員管理</h3>
          <p className="text-sm text-gray-600">管理系統會員</p>
          <p className="text-xs text-gray-500 mt-1">路徑: /admin/members</p>
        </button>

        <button
          onClick={() => router.push('/admin/products')}
          className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          disabled={!user}
        >
          <h3 className="font-semibold mb-2">商品管理</h3>
          <p className="text-sm text-gray-600">管理商品目錄</p>
          <p className="text-xs text-gray-500 mt-1">路徑: /admin/products</p>
        </button>

        <button
          onClick={() => router.push('/admin/orders')}
          className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          disabled={!user}
        >
          <h3 className="font-semibold mb-2">訂單管理</h3>
          <p className="text-sm text-gray-600">查看和管理訂單</p>
          <p className="text-xs text-gray-500 mt-1">路徑: /admin/orders</p>
        </button>
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-yellow-50">
        <h2 className="text-lg font-semibold mb-2">測試帳號資訊</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-1">管理員帳號</h3>
            <ul className="text-sm space-y-1">
              <li>統一編號: <code className="bg-gray-100 px-1 rounded">12345678</code></li>
              <li>密碼: <code className="bg-gray-100 px-1 rounded">Admin1234!</code></li>
              <li>角色: <code className="bg-gray-100 px-1 rounded">SUPER_ADMIN</code></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-1">測試用戶帳號</h3>
            <ul className="text-sm space-y-1">
              <li>統一編號: <code className="bg-gray-100 px-1 rounded">87654321</code></li>
              <li>密碼: <code className="bg-gray-100 px-1 rounded">User1234!</code></li>
              <li>角色: <code className="bg-gray-100 px-1 rounded">MEMBER</code></li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          💡 提示: 使用管理員帳號登入後，所有管理員頁面都應該可正常訪問。
        </p>
      </div>
    </div>
  );
}