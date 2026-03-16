'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategoryForm } from '@/components/admin/category-form';

export default function NewProductCategoryPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);

  const handleSuccess = () => {
    router.push('/admin/products/categories');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">新增商品分類</h1>
        <p className="mt-2 text-gray-600">建立新的商品分類</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>分類資訊</CardTitle>
        </CardHeader>
        <CardContent>
          {showForm && (
            <CategoryForm
              onSuccess={handleSuccess}
              onCancel={() => router.back()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
