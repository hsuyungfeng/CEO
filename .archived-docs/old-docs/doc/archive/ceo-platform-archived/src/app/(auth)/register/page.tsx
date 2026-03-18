'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 驗證
    if (!formData.name || !formData.taxId || !formData.email || !formData.password) {
      setError('請填寫所有必填欄位');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('密碼與確認密碼不符');
      setLoading(false);
      return;
    }

    if (formData.taxId.length !== 8 || !/^\d+$/.test(formData.taxId)) {
      setError('統一編號必須是8位數字');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('密碼至少需要6位');
      setLoading(false);
      return;
    }

    try {
      // 呼叫註冊 API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          // 顯示所有驗證錯誤
          const errorMessages = data.errors.map((err: { message: string }) => err.message).join(', ');
          setError(errorMessages);
        } else {
          setError(data.error || '註冊失敗，請稍後再試');
        }
        setLoading(false);
        return;
      }

      // 註冊成功，重新導向到登入頁面
      router.push('/login?registered=true');

    } catch (err) {
      console.error('註冊錯誤:', err);
      setError('網路錯誤，請檢查連線後再試');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">會員註冊</CardTitle>
          <CardDescription className="text-center">
            請填寫公司資訊完成註冊
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">公司名稱 *</Label>
              <Input
                id="name"
                type="text"
                placeholder="請輸入公司名稱"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">統一編號 *</Label>
              <Input
                id="taxId"
                type="text"
                placeholder="請輸入8位數統一編號"
                value={formData.taxId}
                onChange={handleChange}
                maxLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件 *</Label>
              <Input
                id="email"
                type="email"
                placeholder="請輸入電子郵件"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">聯絡電話</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="請輸入聯絡電話"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼 *</Label>
              <Input
                id="password"
                type="password"
                placeholder="請輸入密碼（至少6位）"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認密碼 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="請再次輸入密碼"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? '註冊中...' : '註冊'}
            </Button>
            <div className="mt-4 text-center text-sm">
              <p className="text-gray-600">
                已有帳號？{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/login')}>
                  點此登入
                </Button>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}