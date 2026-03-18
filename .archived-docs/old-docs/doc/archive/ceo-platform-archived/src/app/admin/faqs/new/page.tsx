'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { FaqForm } from '@/components/admin/faq-form';
import { toast } from 'sonner';

export default function NewFaqPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSuccess = () => {
    toast.success('FAQ 創建成功');
    router.push('/admin/faqs');
    router.refresh();
  };

  const handleCancel = () => {
    router.push('/admin/faqs');
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
          <h1 className="text-3xl font-bold text-gray-900">新增 FAQ</h1>
          <p className="mt-2 text-gray-600">創建新的常見問題與解答</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FAQ 信息</CardTitle>
        </CardHeader>
        <CardContent>
          <FaqForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}