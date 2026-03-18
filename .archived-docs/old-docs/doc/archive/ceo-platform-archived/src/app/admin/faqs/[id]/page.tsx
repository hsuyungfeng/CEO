import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { FaqForm } from '@/components/admin/faq-form';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface FaqData {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default async function EditFaqPage({ params }: RouteParams) {
  const { id } = await params;

  // 獲取 FAQ 數據
  let faq: FaqData | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/faqs/${id}`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      faq = result.data;
    } else {
      error = result.error || '獲取 FAQ 數據失敗';
    }
  } catch (err) {
    console.error('獲取 FAQ 數據錯誤:', err);
    error = '獲取 FAQ 數據時發生錯誤';
  }

  // 如果獲取數據失敗，顯示錯誤
  if (error || !faq) {
    return (
      <div>
        <div className="mb-8">
          <Link href="/admin/faqs">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回 FAQ 列表
            </Button>
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">編輯 FAQ</h1>
            <p className="mt-2 text-gray-600">編輯常見問題與解答</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error || 'FAQ 不存在'}</p>
              <Link href="/admin/faqs">
                <Button variant="outline">返回 FAQ 列表</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 準備表單初始數據
  const initialData = {
    question: faq.question,
    answer: faq.answer,
    isActive: faq.isActive,
    sortOrder: faq.sortOrder,
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/faqs">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回 FAQ 列表
          </Button>
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">編輯 FAQ</h1>
          <p className="mt-2 text-gray-600">編輯常見問題與解答</p>
          <div className="mt-1 text-sm text-gray-500">
            <span>創建時間: {new Date(faq.createdAt).toLocaleString('zh-TW')}</span>
            <span className="ml-4">最後更新: {new Date(faq.updatedAt).toLocaleString('zh-TW')}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FAQ 信息</CardTitle>
        </CardHeader>
        <CardContent>
          <FaqForm
            faqId={id}
            initialData={initialData}
            onSuccess={() => {
              // 成功處理在 FaqForm 組件內完成
            }}
            onCancel={() => {
              // 取消處理在 FaqForm 組件內完成
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}