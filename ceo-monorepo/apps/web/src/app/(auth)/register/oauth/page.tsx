'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

function OAuthRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthData, setOauthData] = useState<{ email: string; name: string; picture?: string } | null>(null);
  
  const [formData, setFormData] = useState({
    // 企業基本資料
    companyName: '',
    taxId: '',
    contactPerson: '',
    phone: '',
    fax: '',
    address: '',
    
    // 帳戶資料（從 OAuth 預填）
    email: '',
    name: '',
    
    // 密碼設定
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // 從 URL 參數取得暫存 OAuth ID
    const tempOAuthId = searchParams.get('id');
    if (!tempOAuthId) {
      setError('無效的註冊連結，請重新嘗試');
      return;
    }

    // 取得暫存 OAuth 資料
    const fetchOAuthData = async () => {
      try {
        const response = await fetch(`/api/auth/oauth/temp?id=${tempOAuthId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '無法取得註冊資料');
        }

        setOauthData(data);
        setFormData(prev => ({
          ...prev,
          email: data.email,
          name: data.name,
          companyName: data.name || '', // 預設使用 Google 名稱作為公司名稱
        }));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '載入註冊資料失敗');
      }
    };

    fetchOAuthData();
  }, [searchParams]);

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

    // 驗證必填欄位
    const requiredFields = [
      'companyName', 'taxId', 'contactPerson', 'phone', 
      'address', 'password', 'confirmPassword'
    ];
    
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        setError(`請填寫${getFieldLabel(field)}`);
        setLoading(false);
        return;
      }
    }

    // 驗證統一編號
    if (formData.taxId.length !== 8 || !/^\d+$/.test(formData.taxId)) {
      setError('統一編號必須是8位數字');
      setLoading(false);
      return;
    }

    // 驗證密碼
    if (formData.password.length < 8) {
      setError('密碼長度至少8位');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('密碼與確認密碼不符');
      setLoading(false);
      return;
    }

    try {
      const tempOAuthId = searchParams.get('id');
      const response = await fetch('/api/auth/register/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempOAuthId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '註冊失敗，請稍後再試');
        setLoading(false);
        return;
      }

      // 註冊成功，自動登入並重定向
      router.push('/(shop)');
      router.refresh();

    } catch (err) {
      console.error('註冊錯誤:', err);
      setError('網路錯誤，請檢查連線後再試');
      setLoading(false);
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      companyName: '公司名稱',
      taxId: '統一編號',
      contactPerson: '聯絡人',
      phone: '電話',
      address: '地址',
      password: '密碼',
      confirmPassword: '確認密碼',
    };
    return labels[field] || field;
  };

  if (error && !oauthData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">註冊錯誤</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => router.push('/register')}>
                返回註冊頁面
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">企業帳戶註冊</CardTitle>
          <CardDescription className="text-center">
            請填寫您的企業資料以完成註冊
          </CardDescription>
          
          {oauthData && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {oauthData.picture && (
                  <img 
                    src={oauthData.picture} 
                    alt={oauthData.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">Google 帳戶：{oauthData.email}</p>
                  <p className="text-sm text-gray-600">請補齊以下企業資料以完成註冊</p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-4">企業基本資料</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">公司名稱 *</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="請輸入公司全名"
                    value={formData.companyName}
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
                  <Label htmlFor="contactPerson">聯絡人 *</Label>
                  <Input
                    id="contactPerson"
                    type="text"
                    placeholder="請輸入聯絡人姓名"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">電話 *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="請輸入公司電話"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fax">傳真號碼</Label>
                  <Input
                    id="fax"
                    type="tel"
                    placeholder="請輸入傳真號碼"
                    value={formData.fax}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">公司地址 *</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="請輸入完整公司地址"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">帳戶資料</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">電子郵件</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">此為您的 Google 帳戶郵件，無法修改</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">此為您的 Google 帳戶名稱</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">設定密碼</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">密碼 *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="請設定至少8位數密碼"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-sm text-gray-500">密碼長度至少8位</p>
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
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>注意：</strong> 註冊完成後，您的 Google 帳戶將會與企業帳戶連結。
                未來可以使用 Google 帳戶快速登入，或使用統一編號+密碼登入。
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !oauthData}
              size="lg"
            >
              {loading ? '註冊中...' : '完成註冊'}
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

export default function OAuthRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    }>
      <OAuthRegisterContent />
    </Suspense>
  );
}