'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestSessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (response.ok) {
          setSession(data.user);
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error('獲取 session 錯誤:', error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taxId: '12345678',
          password: 'Admin1234!',
          rememberMe: false,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('登入成功！重新整理頁面查看 session');
        window.location.reload();
      } else {
        alert(`登入失敗: ${data.error}`);
      }
    } catch (error) {
      console.error('登入錯誤:', error);
      alert('登入錯誤，請檢查控制台');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        alert('登出成功！');
        window.location.reload();
      }
    } catch (error) {
      console.error('登出錯誤:', error);
    }
  };

  const testAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      const data = await response.json();
      
      if (response.ok) {
        alert(`管理員 API 訪問成功: ${JSON.stringify(data, null, 2)}`);
      } else {
        alert(`管理員 API 訪問失敗: ${data.error || '未知錯誤'}`);
      }
    } catch (error) {
      alert(`管理員 API 訪問錯誤: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="p-8">載入中...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session 測試頁面</h1>
      
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">當前 Session 狀態</h2>
        {session ? (
          <pre className="bg-white p-4 rounded border overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        ) : (
          <p className="text-red-600">未登入</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            使用管理員帳號登入
          </button>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            登出
          </button>
        </div>

        <div>
          <button
            onClick={testAdminAccess}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={!session}
          >
            測試管理員 API 訪問
          </button>
          <p className="text-sm text-gray-600 mt-1">
            測試 /api/admin/dashboard 端點訪問權限
          </p>
        </div>

        <div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            disabled={!session}
          >
            前往管理員後台 (/admin)
          </button>
          <p className="text-sm text-gray-600 mt-1">
            直接訪問管理員後台頁面
          </p>
        </div>

        <div>
          <button
            onClick={() => router.push('/admin/members')}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            disabled={!session}
          >
            前往會員管理 (/admin/members)
          </button>
          <p className="text-sm text-gray-600 mt-1">
            測試管理員子頁面訪問
          </p>
        </div>
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-yellow-50">
        <h2 className="text-lg font-semibold mb-2">測試帳號資訊</h2>
        <ul className="space-y-2">
          <li>
            <strong>管理員帳號:</strong>
            <ul className="ml-4">
              <li>統一編號: <code>12345678</code></li>
              <li>密碼: <code>Admin1234!</code></li>
              <li>角色: <code>SUPER_ADMIN</code></li>
            </ul>
          </li>
          <li>
            <strong>測試用戶帳號:</strong>
            <ul className="ml-4">
              <li>統一編號: <code>87654321</code></li>
              <li>密碼: <code>User1234!</code></li>
              <li>角色: <code>MEMBER</code></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}