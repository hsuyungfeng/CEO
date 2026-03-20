'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RotateCcw, ShoppingCart, CheckCircle } from 'lucide-react';

interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productImage?: string;
  productUnit?: string;
  productSpec?: string;
}

interface Order {
  id: string;
  orderNo?: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: string;
  billingAddress?: string;
  note?: string;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === '1';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderDone, setReorderDone] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders/${params.id}`);
        if (!response.ok) throw new Error(`載入訂單失敗: ${response.status}`);
        const data = await response.json();
        const orderData = data.data || data.order || data;
        setOrder(orderData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '無法載入訂單');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [params.id]);

  const cancelOrder = async () => {
    if (!confirm('確定要取消此訂單嗎？')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取消失敗');
      setOrder(prev => prev ? { ...prev, status: 'CANCELLED' } : prev);
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消訂單失敗');
    } finally {
      setCancelling(false);
    }
  };

  // 再購：將訂單中所有商品加回購物車
  const handleReorder = async () => {
    if (!order || reordering) return;
    setReordering(true);
    try {
      const itemsToAdd = order.items.filter(i => i.productId);
      await Promise.all(
        itemsToAdd.map(item =>
          fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
          })
        )
      );
      setReorderDone(true);
      setTimeout(() => router.push('/cart'), 1200);
    } catch {
      alert('加入購物車失敗，請稍後再試');
    } finally {
      setReordering(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary';
      case 'CONFIRMED': return 'default';
      case 'SHIPPED': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return '待處理';
      case 'CONFIRMED': return '已確認';
      case 'SHIPPED': return '已出貨';
      case 'COMPLETED': return '已完成';
      case 'CANCELLED': return '已取消';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <Button
            variant="outline"
            className="mb-6 flex items-center"
            onClick={() => router.push('/orders')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回訂單列表
          </Button>
          <div className="text-center py-12">
            <p className="text-red-500">錯誤：{error || '訂單不存在'}</p>
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              重新載入
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Button
          variant="outline"
          className="mb-6 flex items-center"
          onClick={() => router.push('/orders')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回訂單列表
        </Button>

        {isSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            ✅ 訂單已成功送出！我們將盡快確認您的訂單。
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
               <div>
                 <CardTitle>訂單編號: {order.orderNo || order.id}</CardTitle>
                 <div className="text-sm text-muted-foreground">訂購日期: {formatDate(order.createdAt)}</div>
               </div>
              <div className="mt-2 sm:mt-0">
                <Badge variant={getStatusVariant(order.status)}>
                  {getStatusText(order.status)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-3">配送資訊</h3>
                <p className="text-gray-600">{order.shippingAddress || '未提供'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">發票資訊</h3>
                <p className="text-gray-600">{order.billingAddress || '未提供'}</p>
              </div>
            </div>

            {order.note && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">訂單備註</h3>
                <p className="text-gray-600">{order.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>訂單明細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center">
                    {item.productImage && (
                      <div className="w-16 h-16 bg-gray-200 mr-4">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{item.productName}</h4>
                      <p className="text-sm text-gray-600">{item.quantity} {item.productUnit || '個'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">NT${Number(item.unitPrice).toLocaleString('zh-TW')}/{item.productUnit || '個'}</p>
                    <p className="text-sm text-gray-600">NT${Number(item.subtotal).toLocaleString('zh-TW')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-end flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                {/* 再購按鈕 */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reordering || reorderDone}
                  onClick={handleReorder}
                  className="gap-1.5"
                >
                  {reorderDone
                    ? <><CheckCircle className="w-4 h-4 text-green-600" /> 已加入購物車</>
                    : reordering
                      ? <><RotateCcw className="w-4 h-4 animate-spin" /> 加入中...</>
                      : <><ShoppingCart className="w-4 h-4" /> 再次購買</>
                  }
                </Button>
                {order.status === 'PENDING' && (
                  <Button variant="destructive" size="sm" disabled={cancelling} onClick={cancelOrder}>
                    {cancelling ? '取消中...' : '取消訂單'}
                  </Button>
                )}
              </div>
              <div className="w-full md:w-1/3">
                <div className="flex justify-between py-2">
                  <span>小計</span>
                  <span>NT${Number(order.totalAmount).toLocaleString('zh-TW')}</span>
                </div>
                <div className="flex justify-between py-2 border-t font-bold text-lg">
                  <span>總計</span>
                  <span>NT${Number(order.totalAmount).toLocaleString('zh-TW')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
