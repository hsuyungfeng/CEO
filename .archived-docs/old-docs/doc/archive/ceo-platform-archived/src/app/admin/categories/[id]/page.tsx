'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CategoryForm } from '@/components/admin/category-form';
import { CategoryDetail } from '@/types/admin';
import { toast } from 'sonner';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加載分類數據
  useEffect(() => {
    const loadCategory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/categories/${categoryId}`);
        const result = await response.json();
        
        if (result.success) {
          setCategory(result.data);
        } else {
          setError(result.error || '加載分類失敗');
          toast.error(result.error || '加載分類失敗');
        }
      } catch (error) {
        setError('網絡錯誤，請稍後再試');
        toast.error('網絡錯誤，請稍後再試');
        console.error('加載分類錯誤:', error);
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      loadCategory();
    }
  }, [categoryId]);

  const handleSuccess = () => {
    toast.success('分類更新成功');
    router.push('/admin/categories');
    router.refresh();
  };

  const handleCancel = () => {
    router.push('/admin/categories');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="space-y-4">
        <Link href="/admin/categories">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回分類列表
          </Button>
        </Link>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <p className="mb-2">{error || '分類不存在'}</p>
              <Link href="/admin/categories">
                <Button variant="outline">返回分類列表</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">編輯分類</h1>
          <p className="mt-2 text-gray-600">修改分類信息</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>分類信息</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            categoryId={categoryId}
            initialData={{
              name: category.name,
              parentId: category.parentId,
              sortOrder: category.sortOrder,
              isActive: category.isActive,
            }}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      {/* 分類統計信息 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>分類統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-600">層級</div>
              <div className="mt-1 text-2xl font-bold">{category.level} 級</div>
            </div>
            
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-600">商品數量</div>
              <div className="mt-1 text-2xl font-bold">{category.productCount || 0}</div>
            </div>
            
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-600">子分類數量</div>
              <div className="mt-1 text-2xl font-bold">{category.children?.length || 0}</div>
            </div>
            
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-600">創建時間</div>
              <div className="mt-1 text-sm">
                {new Date(category.createdAt).toLocaleDateString('zh-TW')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}