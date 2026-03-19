'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface TemplateItem {
  productId: string;
  productName: string;
  supplierId?: string;
  quantity: number;
  notes?: string;
}

export default function NewPurchaseTemplatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [items, setItems] = useState<TemplateItem[]>([
    { productId: '', productName: '', quantity: 1 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('模板至少需要一個商品');
      return;
    }
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof TemplateItem, value: TemplateItem[keyof TemplateItem]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('請輸入模板名稱');
      return;
    }
    
    if (items.some(item => !item.productId.trim())) {
      toast.error('請填寫所有商品的產品ID');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/purchase-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          isPublic,
          items: items.map(item => ({
            productId: item.productId,
            supplierId: item.supplierId || undefined,
            quantity: item.quantity,
            notes: item.notes || undefined
          }))
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '創建模板失敗');
      }
      
      const data = await response.json();
      toast.success('模板創建成功');
      router.push('/purchase-templates');
      
    } catch (error: unknown) {
      console.error('創建模板失敗:', error);
      toast.error(error instanceof Error ? error.message : '創建模板失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">載入中...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/purchase-templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回模板列表
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          創建新採購模板
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          將常用商品組合保存為模板，方便快速重購
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：模板資訊 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>模板資訊</CardTitle>
                <CardDescription>
                  設定模板的基本資訊
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">模板名稱 *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：每月辦公用品採購"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="描述此模板的用途或注意事項"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPublic" className="cursor-pointer">
                      公開模板
                    </Label>
                    <p className="text-sm text-gray-500">
                      其他用戶可以看到和使用此模板
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>操作提示</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>• 模板名稱應清晰描述用途</p>
                <p>• 添加您經常一起購買的商品</p>
                <p>• 設定合適的數量以方便重購</p>
                <p>• 公開模板可以幫助其他用戶</p>
              </CardContent>
            </Card>
          </div>
          
          {/* 右側：商品列表 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>商品列表</CardTitle>
                    <CardDescription>
                      添加到此模板的商品（至少1個，最多50個）
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    添加商品
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    尚未添加任何商品
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium">商品 #{index + 1}</h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={items.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`productId-${index}`}>產品ID *</Label>
                            <Input
                              id={`productId-${index}`}
                              value={item.productId}
                              onChange={(e) => updateItem(index, 'productId', e.target.value)}
                              placeholder="輸入產品ID"
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`productName-${index}`}>產品名稱</Label>
                            <Input
                              id={`productName-${index}`}
                              value={item.productName}
                              onChange={(e) => updateItem(index, 'productName', e.target.value)}
                              placeholder="輸入產品名稱（可選）"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`quantity-${index}`}>數量 *</Label>
                            <Input
                              id={`quantity-${index}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`supplierId-${index}`}>供應商ID</Label>
                            <Input
                              id={`supplierId-${index}`}
                              value={item.supplierId || ''}
                              onChange={(e) => updateItem(index, 'supplierId', e.target.value)}
                              placeholder="輸入供應商ID（可選）"
                            />
                          </div>
                          
                          <div className="md:col-span-2 space-y-2">
                            <Label htmlFor={`notes-${index}`}>備註</Label>
                            <Input
                              id={`notes-${index}`}
                              value={item.notes || ''}
                              onChange={(e) => updateItem(index, 'notes', e.target.value)}
                              placeholder="商品備註（可選）"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/purchase-templates">
                    取消
                  </Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '創建中...' : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      創建模板
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}