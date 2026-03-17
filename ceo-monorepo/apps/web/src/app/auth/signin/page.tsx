'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { FcGoogle } from 'react-icons/fc';
import { AppleIcon } from '@/components/ui/apple-icon';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [taxId, setTaxId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 驗證輸入
    if (!taxId || !password) {
      setError('請填寫統一編號和密碼');
      setLoading(false);
      return;
    }

    if (taxId.length !== 8 || !/^\d+$/.test(taxId)) {
      setError('統一編號必須是8位數字');
      setLoading(false);
      return;
    }

    try {
      // 使用 NextAuth signIn
      const result = await signIn('credentials', {
        taxId,
        password,
        redirect: false,
        callbackUrl: callbackUrl || '/',
      });

      if (!result?.ok || result?.error) {
        setError(result?.error || '登入失敗，請稍後再試');
        setLoading(false);
        return;
      }

      // 登入成功，等待 auth 狀態更新後重新導向
      // 確保導向到正確的 URL（解碼 callbackUrl）
      setTimeout(() => {
        const redirectUrl = callbackUrl && callbackUrl !== '/'
          ? decodeURIComponent(callbackUrl)
          : '/';
        router.push(redirectUrl);
        router.refresh();
      }, 100);

    } catch (err) {
      console.error('登入錯誤:', err);
      setError('網路錯誤，請檢查連線後再試');
      setLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, {
      callbackUrl,
      redirect: true,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <main id="main-content" className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center" id="signin-title">
              會員登入
            </CardTitle>
            <CardDescription className="text-center">
              請輸入您的統一編號和密碼
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} aria-labelledby="signin-title">
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" role="alert" aria-live="assertive">
                  <AlertDescription id="error-message">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="tax-id">統一編號</Label>
                <Input
                  id="tax-id"
                  type="text"
                  placeholder="請輸入8位數統一編號"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  required
                  aria-required="true"
                  aria-describedby={error ? 'error-message' : undefined}
                  maxLength={8}
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  title="統一編號必須是8位數字"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">密碼</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={() => router.push('/auth/forgot-password')}
                    aria-label="忘記密碼？前往重設密碼頁面"
                  >
                    忘記密碼？
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="請輸入密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  aria-describedby={error ? 'error-message' : undefined}
                  minLength={6}
                  title="密碼至少需要6位"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? '登入中...' : '登入'}
              </Button>

              <div className="my-4" role="separator" aria-orientation="horizontal">
                <Separator>
                  <span className="px-2 text-sm text-gray-500 bg-white">或</span>
                </Separator>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthSignIn('google')}
                aria-label="使用 Google 帳戶登入"
              >
                <FcGoogle className="mr-2 h-4 w-4" aria-hidden="true" />
                使用 Google 帳戶登入
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => handleOAuthSignIn('apple')}
                aria-label="使用 Apple 帳戶登入"
              >
                <AppleIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                使用 Apple 帳戶登入
              </Button>

              <div className="mt-4 text-center text-sm">
                <p className="text-gray-600">
                  還沒有帳號？{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => router.push('/auth/register')}
                    aria-label="前往註冊頁面"
                  >
                    點此註冊
                  </Button>
                </p>
                <p className="text-gray-600 mt-2">
                  或使用{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => router.push('/auth/email-login')}
                    aria-label="使用郵件登入"
                  >
                    郵件登入
                  </Button>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
