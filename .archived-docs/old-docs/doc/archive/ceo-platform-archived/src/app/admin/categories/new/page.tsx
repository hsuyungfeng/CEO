'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { CategoryForm } from '@/components/admin/category-form';
import { toast } from 'sonner';

export default function NewCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSuccess = () => {
    toast.success('分類創建成功');
    router.push('/admin/categories');
    router.refresh();
  };

  const handleCancel = () => {
    router.push('/admin/categories');
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/categories">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回分類列表
          </Button>
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">新增分類</h1>
          <p className="mt-2 text-gray-600">創建新的商品分類</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>分類信息</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}